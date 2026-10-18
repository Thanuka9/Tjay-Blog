import PDFDocument from "pdfkit";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { splitContent } from "@/lib/content";
import { articleFeatures, evidencePlacement } from "@/lib/article-features";
import { extractHeadings } from "@/lib/headings";
import { CITATIONS_BY_SLUG } from "@/lib/citations";
import { formatDate, publicationUrl, site } from "@/lib/site";
import type { JournalIssue } from "@/lib/issues";
import { issueCoverImage, issueCoverDescription } from "@/lib/issue-cover";
import { EVIDENCE_STAGES, type EvidenceLadder, type Post } from "@/lib/types";

type Node = {
  type: string;
  value?: string;
  depth?: number;
  url?: string;
  alt?: string;
  title?: string;
  ordered?: boolean;
  start?: number;
  identifier?: string;
  children?: Node[];
};

const parse = (source: string) =>
  unified().use(remarkParse).use(remarkGfm).parse(source) as Node;

const INK = "#141A2E",
  NAVY = "#0E1C3B",
  TEAL = "#1C6670",
  PAPER = "#F5F1E8",
  MUTED = "#4B5365",
  BORDER = "#D8D2C5";

const MAX_IMAGE_BYTES = 15_000_000;

const clean = (value: string) =>
  value.replace(/\[\^(\d+)\]/g, "[$1]").replace(/[\u200b-\u200d\ufeff]/g, "");

function inline(node: Node): string {
  const value = node.value ?? node.children?.map(inline).join("") ?? "";
  if (node.type === "break") return "\n";
  if (node.type === "image" || node.type === "imageReference") return "";
  if (node.type === "link" && node.url && !node.url.startsWith("#"))
    return `${value} (${node.url})`;
  if (node.type === "footnoteReference") return `[${node.identifier}]`;
  return clean(value);
}

function imagesIn(node: Node): Node[] {
  return [
    ...(node.type === "image" ? [node] : []),
    ...(node.children?.flatMap(imagesIn) ?? []),
  ];
}

/** Resolve any root-relative asset that is actually inside /public. */
function publicFile(source: string) {
  if (!source.startsWith("/") || source.startsWith("//")) return null;
  const rawPath = source.split(/[?#]/, 1)[0];
  const root = path.resolve(process.cwd(), "public");
  const file = path.resolve(root, `.${decodeURIComponent(rawPath)}`);
  if (file === root || !file.startsWith(`${root}${path.sep}`)) return null;
  return file;
}

function trustedRemoteImage(url: URL) {
  const host = url.hostname.toLowerCase();
  const vercelBlob = host.endsWith(".public.blob.vercel-storage.com");
  const neonStorage = host.endsWith(".aws.neon.tech") && host.includes(".storage.");
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    (vercelBlob || neonStorage)
  );
}

/**
 * Live articles can point at hashed Neon object-storage URLs while the same
 * publication figure is also committed under public/articles/<topic>.
 * Prefer that local canonical copy when available so generated PDFs remain
 * reproducible even if the image CDN is temporarily unavailable.
 */
async function localArticleFigureMirror(source: string): Promise<Buffer | null> {
  try {
    const url = new URL(source);
    const segments = decodeURIComponent(url.pathname).split("/").filter(Boolean);
    const articlesIndex = segments.lastIndexOf("articles");
    const topic = segments[articlesIndex + 1];
    const filename = segments.at(-1) ?? "";
    if (
      articlesIndex < 0 ||
      !topic ||
      !/^[a-z0-9][a-z0-9-]*$/i.test(topic)
    )
      return null;

    const match = filename.match(
      /^(figure-\d+)(?:-[a-f0-9]+)?\.(?:png|jpe?g|webp|avif)$/i,
    );
    if (!match) return null;

    const root = path.resolve(process.cwd(), "public");
    const articleDir = path.resolve(root, "articles", topic);
    if (!articleDir.startsWith(`${root}${path.sep}`)) return null;

    for (const extension of ["png", "jpg", "jpeg", "webp", "avif"]) {
      try {
        const candidate = path.resolve(articleDir, `${match[1]}.${extension}`);
        if (!candidate.startsWith(`${articleDir}${path.sep}`)) continue;
        const data = await readFile(candidate);
        if (data.length <= MAX_IMAGE_BYTES) return data;
      } catch {
        // Try the next supported local representation.
      }
    }
  } catch {
    // Not a valid remote URL or no local mirror exists.
  }
  return null;
}

async function remoteImageBytes(source: string): Promise<Buffer | null> {
  try {
    const url = new URL(source);
    if (!trustedRemoteImage(url)) return null;

    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8" },
    });
    if (!response.ok) return null;

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_IMAGE_BYTES) return null;

    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

async function imageBuffer(source: string): Promise<Buffer | null> {
  try {
    let data: Buffer | null = null;
    const local = publicFile(source);
    if (local) {
      data = await readFile(local);
    } else {
      data = await localArticleFigureMirror(source);
      if (!data) data = await remoteImageBytes(source);
    }

    if (!data || data.length > MAX_IMAGE_BYTES) return null;
    return await sharp(data, { limitInputPixels: 40000000 })
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

export async function journalPdf(
  posts: Post[],
  issue?: JournalIssue,
  contentsOnly = false,
  articleOnly = false,
): Promise<Buffer> {
  if (articleOnly) return articlePrintPdf(posts[0], issue);
  const sources = new Set<string>();
  const coverImage = issue ? issueCoverImage(issue) : null;
  if (coverImage) sources.add(coverImage);
  if (!contentsOnly)
    for (const post of posts) {
      if (post.coverImage) sources.add(post.coverImage);
      for (const block of splitContent(post.content))
        if (block.type === "markdown")
          for (const image of imagesIn(parse(block.content)))
            if (image.url) sources.add(image.url);
    }

  const images = new Map<string, Buffer | null>();
  await Promise.all(
    [...sources].map(async (source) =>
      images.set(source, await imageBuffer(source)),
    ),
  );

  const doc = new PDFDocument({
    size: "A4",
    margin: 54,
    bufferPages: true,
    info: {
      Title:
        issue && !articleOnly
          ? `${site.name} — ${issue.label}`
          : posts[0].title,
      Author: site.name,
      Subject: site.supportingDescription,
    },
  });

  const chunks: Buffer[] = [];
  for (const [name, file] of Object.entries({
    "Journal-Serif": "newsreader-400.ttf",
    "Journal-Serif-Medium": "newsreader-500.ttf",
    "Journal-Serif-Italic": "newsreader-italic-400.ttf",
    "Journal-Sans": "ibm-plex-sans-400.ttf",
    "Journal-Sans-Medium": "ibm-plex-sans-500.ttf",
    "Journal-Sans-Semibold": "ibm-plex-sans-600.ttf",
  }))
    doc.registerFont(
      name,
      await readFile(path.join(process.cwd(), "public/fonts/pdf", file)),
    );

  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const width = doc.page.width - 108;

  function background() {
    const { x, y } = doc;
    doc
      .save()
      .rect(0, 0, doc.page.width, doc.page.height)
      .fill(PAPER)
      .restore();
    doc.x = x;
    doc.y = y;
  }

  background();
  doc.on("pageAdded", background);

  function room(height: number) {
    if (doc.y + height > doc.page.height - 70) doc.addPage();
  }

  function text(value: string, size = 11, heading = false, font?: string) {
    if (!value.trim()) return;
    doc
      .font(
        font ||
          (size <= 10
            ? heading
              ? "Journal-Sans-Semibold"
              : "Journal-Sans"
            : heading
              ? "Journal-Serif-Medium"
              : "Journal-Serif"),
      )
      .fontSize(size)
      .fillColor(heading ? NAVY : INK)
      .text(clean(value), 54, doc.y, { width, lineGap: 4 });
    doc.moveDown(0.6);
  }

  function heading(value: string, size = 19) {
    room(70);
    doc.moveDown(0.4);
    text(value, size, true);
  }

  async function image(source: string, alt = "", title = "") {
    const data = images.get(source);
    const label = clean(alt.trim());
    const detail = clean(title.trim());
    const caption = [label, detail && detail !== label ? detail : ""]
      .filter(Boolean)
      .join(" ");

    if (!data) {
      text(
        `[Figure unavailable in this PDF: ${caption || source}. View the online article: ${source}]`,
        9,
      );
      return;
    }

    const metadata = await sharp(data).metadata();
    const naturalHeight =
      (width * (metadata.height ?? 1)) / (metadata.width ?? 1);
    const height = Math.min(315, naturalHeight);

    doc.font("Journal-Sans").fontSize(9);
    const captionHeight = caption
      ? doc.heightOfString(caption, { width, lineGap: 2 }) + 18
      : 8;
    room(height + captionHeight + 18);

    const y = doc.y;
    doc
      .save()
      .rect(54, y, width, height)
      .fill("#FBF9F4")
      .restore();
    doc.image(data, 54, y, {
      fit: [width, height],
      align: "center",
      valign: "center",
    });
    doc.x = 54;
    doc.y = y + height + 10;

    if (label) {
      doc
        .font("Journal-Sans-Semibold")
        .fontSize(9)
        .fillColor(NAVY)
        .text(label, 54, doc.y, {
          width,
          lineGap: 2,
          continued: Boolean(detail && detail !== label),
        });
      if (detail && detail !== label) {
        doc
          .font("Journal-Sans")
          .fillColor(MUTED)
          .text(` ${detail}`, { width, lineGap: 2 });
      }
    } else if (detail) {
      doc
        .font("Journal-Sans")
        .fontSize(9)
        .fillColor(MUTED)
        .text(detail, 54, doc.y, { width, lineGap: 2 });
    }
    doc.moveDown(0.9);
  }

  function table(rows: string[][]) {
    doc.font("Journal-Sans").fontSize(9).fillColor(INK);
    doc.table({
      data: rows,
      maxWidth: width,
      columnStyles: Array.from(
        { length: Math.max(...rows.map((row) => row.length)) },
        () => "*",
      ),
      defaultStyle: {
        border: 0.5,
        borderColor: BORDER,
        padding: 6,
        textColor: INK,
      },
      rowStyles: (index) =>
        index === 0 ? { backgroundColor: "#F5F0E6" } : undefined,
    });
    doc.x = 54;
    doc.moveDown();
  }

  let beforeSection = () => {};

  async function render(node: Node, indent = "") {
    switch (node.type) {
      case "heading":
        if (node.depth === 2) beforeSection();
        heading(
          inline(node),
          node.depth === 1 ? 23 : node.depth === 2 ? 19 : 14,
        );
        break;
      case "paragraph":
        text(indent + inline(node));
        for (const img of imagesIn(node))
          if (img.url)
            await image(img.url, img.alt || "", img.title || "");
        break;
      case "list":
        for (const [index, child] of (node.children || []).entries()) {
          const prefix = node.ordered
            ? `${(node.start || 1) + index}. `
            : "• ";
          for (const part of child.children || [])
            await render(part, indent + prefix);
        }
        break;
      case "blockquote":
        room(60);
        doc
          .save()
          .moveTo(54, doc.y)
          .lineTo(54, doc.y + 36)
          .lineWidth(2)
          .strokeColor(TEAL)
          .stroke()
          .restore();
        doc.x = 68;
        doc
          .font("Journal-Serif-Italic")
          .fontSize(13)
          .fillColor(INK)
          .text(`“${inline(node)}”`, 68, doc.y, {
            width: width - 14,
            lineGap: 4,
          });
        doc.x = 54;
        doc.moveDown(0.8);
        break;
      case "table":
        table(
          (node.children || []).map((row) =>
            (row.children || []).map(inline),
          ),
        );
        break;
      case "code":
        text(node.value || "", 9);
        break;
      case "thematicBreak":
        room(25);
        doc
          .moveTo(54, doc.y)
          .lineTo(54 + width, doc.y)
          .strokeColor(BORDER)
          .stroke();
        doc.moveDown();
        break;
      case "image":
        if (node.url)
          await image(node.url, node.alt || "", node.title || "");
        break;
      case "html":
        text((node.value || "").replace(/<[^>]+>/g, ""));
        break;
      case "definition":
        break;
      case "footnoteDefinition":
        text(`[${node.identifier}] ${inline(node)}`, 9);
        break;
      default:
        for (const child of node.children || []) await render(child, indent);
    }
  }

  function renderLadder(ladder: EvidenceLadder) {
    room(290);
    heading("The evidence ladder", 16);
    text(ladder.subject, 11, true);
    const top = doc.y + 8;
    const stepWidth = width / EVIDENCE_STAGES.length;
    EVIDENCE_STAGES.forEach((stage, index) => {
      const height = 30 + index * 16;
      const x = 54 + stepWidth * index;
      const selected = stage === ladder.stage;
      doc
        .rect(x, top + 94 - height, stepWidth - 4, height)
        .fill(selected ? TEAL : "#D8E5EB");
      doc
        .font("Journal-Sans-Semibold")
        .fontSize(8)
        .fillColor(INK)
        .text(stage, x, top + 102, { width: stepWidth - 6 });
      if (selected)
        doc
          .fontSize(8)
          .fillColor(TEAL)
          .text("Main evidence", x, top + 137, { width: stepWidth - 6 });
    });
    doc.x = 54;
    doc.y = top + 163;
    text(ladder.caption, 10);
    text(
      "Study design and quality matter at every stage. Regulatory approval is a separate assessment for a specific use.",
      9,
    );
  }

  if (issue && !contentsOnly && !articleOnly) {
    doc
      .font("Journal-Sans")
      .fontSize(10)
      .fillColor(TEAL)
      .text("A SCIENCE JOURNAL FOR EVERYONE", 54, 60, {
        width,
        align: "center",
      });
    doc.y = 100;
    text(site.name, 54, true);
    text(site.tagline, 16);
    text(
      `Volume ${issue.volume}, Number ${issue.number} · ${issue.label}`,
      12,
    );
    const y = doc.y + 14;
    if (coverImage && images.get(coverImage)) {
      doc.save().rect(54, y, width * 0.2, 190).fill("#1B2A55");
      doc
        .rect(54 + width * 0.2, y, width * 0.8, 190)
        .clip();
      doc.image(images.get(coverImage)!, 54 + width * 0.2, y, {
        cover: [width * 0.8, 190],
      });
      doc.restore();
    } else {
      doc
        .save()
        .rect(54, y, width, 190)
        .fill("#08152E")
        .rect(54, y, width * 0.22, 190)
        .fill(NAVY);
      for (const scale of [1, 0.8, 0.6, 0.4])
        doc
          .ellipse(54 + width * 0.76, y + 135, 90 * scale, 28 * scale)
          .strokeColor(TEAL)
          .stroke();
      doc.restore();
    }
    doc.y = y + 210;
    for (const post of posts)
      text(`${post.articleCode || ""}   ${post.title}`, 12, true);
    for (const post of issue.upcomingArticles || [])
      text(`${post.articleCode}   ${post.title} · Upcoming`, 12, true);
    doc.addPage();
    heading("From the Editor", 24);
    text(
      issue.editorLetter ||
        "Below the headlines, into the evidence. This issue brings together published articles and their sources. Read the research, consider its limits, and follow the evidence at your own pace.",
      12,
    );
    text(
      `${issue.editorName === site.name ? "TJ" : issue.editorName}, Editor`,
      11,
    );
    heading("About the cover", 16);
    text(issueCoverDescription(issue), 10);
    doc.addPage();
  }

  if (issue && !articleOnly) {
    heading("Table of Contents", 26);
    text(
      `${site.name} · ${issue.label} · Vol. ${issue.volume}, No. ${issue.number}`,
      12,
    );
    for (const post of posts) {
      text(post.articleType || "Research Article", 9, true);
      text(post.title, 15, true);
      text(
        `${post.author} · ${post.articleCode || ""} · ${formatDate(post.publishedAt)}`,
        10,
      );
      text(`${publicationUrl()}/articles/${post.slug}`, 9);
    }
  }

  if (!contentsOnly)
    for (const post of posts) {
      if ((issue && !articleOnly) || post !== posts[0]) doc.addPage();
      text(site.name, 14, true);
      if (issue)
        text(
          `Vol. ${issue.volume} | No. ${issue.number} · ${issue.label}`,
          10,
        );
      text((post.articleType || "Research Article").toUpperCase(), 10, true);
      heading(post.title, 28);
      text(post.excerpt, 13, false, "Journal-Serif-Italic");
      text(
        `${post.author} · Published ${formatDate(post.publishedAt)}${post.articleCode ? ` · ${post.articleCode}` : ""} · ${post.readingTime} min read`,
        10,
      );

      const features = articleFeatures(post);
      if (post.abstract?.length) {
        heading("At a glance", 16);
        for (const section of post.abstract) {
          text(section.label, 10, true);
          text(section.text, 10);
        }
      } else if (features.atAGlance) {
        heading("At a glance", 16);
        for (const [label, body] of [
          ["What we know", features.atAGlance.known],
          ["What we don’t know", features.atAGlance.unknown],
          ["What to watch", features.atAGlance.watch],
        ]) {
          text(label, 10, true);
          text(body, 10);
        }
      }

      if (post.coverImage) await image(post.coverImage);

      const placement = evidencePlacement(
        post.content,
        features.evidenceLadder,
      );
      const headingIds = extractHeadings(post.content).map(
        (heading) => heading.id,
      );
      let headingIndex = 0;
      beforeSection = () => {
        const id = headingIds[headingIndex++];
        if (features.evidenceLadder && placement.before === id)
          renderLadder(features.evidenceLadder);
      };
      if (features.evidenceLadder && placement.start)
        renderLadder(features.evidenceLadder);

      for (const block of splitContent(post.content)) {
        if (block.type === "markdown") {
          for (const node of parse(block.content).children || [])
            await render(node);
        } else {
          heading(block.spec.title, 17);
          if (block.spec.description) text(block.spec.description);
          const labels = block.spec.seriesLabels || [
            "Value",
            "Value 2",
            "Value 3",
          ];
          const count = Math.max(
            1,
            ...block.spec.data.map((row) =>
              row.value3 !== undefined ? 3 : row.value2 !== undefined ? 2 : 1,
            ),
          );
          text(
            `Figure data${block.spec.unit ? ` (${block.spec.unit})` : ""}`,
            9,
            true,
          );
          table([
            ["Category", ...labels.slice(0, count)],
            ...block.spec.data.map((row) => [
              row.name,
              ...[row.value, row.value2, row.value3]
                .slice(0, count)
                .map((value) =>
                  value === undefined ? "" : String(value),
                ),
            ]),
          ]);
        }
      }

      if (features.evidenceLadder && placement.end)
        renderLadder(features.evidenceLadder);

      const references = post.references ?? CITATIONS_BY_SLUG[post.slug] ?? [];
      if (references.length) {
        heading("References", 21);
        for (const citation of references)
          text(
            `${citation.id}. ${citation.title}. ${citation.detail}\n${citation.url}`,
            10,
          );
      }

      room(70);
      doc
        .moveTo(54, doc.y)
        .lineTo(54 + width, doc.y)
        .strokeColor(BORDER)
        .stroke();
      doc.moveDown(0.8);
      text(
        "This article explains published research for a general audience. It is not medical advice.",
        9,
      );
      text(
        `Corrections and updates: ${publicationUrl()}/corrections`,
        9,
      );
    }

  if (issue && !contentsOnly && !articleOnly) {
    doc.addPage();
    heading("Publication information", 24);
    text(site.name, 20, true);
    text(site.supportingDescription);
    text(site.tagline);
    text(`Volume ${issue.volume}, Number ${issue.number} · ${issue.label}`);
    text(
      "The website and generated PDFs share one article source. Subsequent downloads reflect editorial corrections. References are provided alongside each article.",
      10,
    );
    text(
      `${publicationUrl()}/editorial-standards\n${publicationUrl()}/corrections`,
      10,
    );
  }

  const range = doc.bufferedPageRange();
  for (let page = range.start; page < range.start + range.count; page++) {
    doc.switchToPage(page);
    doc
      .font("Journal-Sans")
      .fontSize(9)
      .fillColor(MUTED)
      .text(
        `${site.name} · ${page + 1} / ${range.count}`,
        54,
        doc.page.height - 35,
        { lineBreak: false },
      );
  }

  doc.end();
  return completed;
}


/**
 * Print-edition article renderer. An article download is a compact editorial
 * publication with two-column reading text and full-width figures, not a copy
 * of the full-issue PDF. Both formats consume the SAME article data.
 */
async function articlePrintPdf(post: Post, issue?: JournalIssue): Promise<Buffer> {
  type Piece =
    | { kind: "text" | "heading" | "quote"; text: string; continuation?: boolean }
    | { kind: "figure"; source: string; alt: string; title: string }
    | { kind: "table"; rows: string[][] }
    | { kind: "chart"; spec: { title: string; description?: string; unit?: string; yMax?: number; data: { name: string; value: number }[] } };

  const doc = new PDFDocument({
    size: "A4", margin: 0, bufferPages: true, autoFirstPage: false,
    info: { Title: post.title, Author: site.name, Subject: site.supportingDescription },
  });
  const chunks: Buffer[] = [];
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const faces: Record<string, string> = {
    Serif: "newsreader-400.ttf", SerifMedium: "newsreader-500.ttf",
    SerifItalic: "newsreader-italic-400.ttf",
    Sans: "ibm-plex-sans-400.ttf", SansMedium: "ibm-plex-sans-500.ttf",
    SansBold: "ibm-plex-sans-600.ttf",
  };
  for (const [name, file] of Object.entries(faces)) {
    doc.registerFont(name, await readFile(path.join(process.cwd(), "public/fonts/pdf", file)));
  }

  const PAGE_W = 595.28, M = 46, W = PAGE_W - 2 * M, GAP = 24;
  const CW = (W - GAP) / 2, TOP = 46, BOTTOM = 790;
  const C = { ink: "#14203A", teal: "#417D81", muted: "#596276", line: "#9A9EA7" };
  let y = TOP;
  const newPage = () => { doc.addPage(); y = TOP; };
  const rule = (yy: number, x = M, w = W) => {
    doc.save().lineWidth(0.6).strokeColor(C.line).moveTo(x, yy).lineTo(x + w, yy).stroke().restore();
  };
  const typ = (face: string, size: number, color = C.ink) => {
    doc.font(face).fontSize(size).fillColor(color);
  };
  const height = (value: string, width: number, face: string, size: number, leading = 2) => {
    typ(face, size);
    return doc.heightOfString(value || " ", { width, lineGap: leading });
  };
  const copy = (value: string, x: number, yy: number, width: number,
    face: string, size: number, leading = 2, align: "left" | "right" | "justify" = "left", color = C.ink) => {
    typ(face, size, color);
    doc.text(value, x, yy, { width, lineGap: leading, align });
    return yy + height(value, width, face, size, leading);
  };
  const asText = (node: Node) => inline(node).replace(/\s+/g, " ").trim();

  // Page one: the same publication identity, large headline, deck and abstract
  // used by the supplied Article Print reference.
  newPage();
  try {
    const logo = await imageBuffer("/brand/abyss-logo.png");
    if (logo) doc.image(logo, M, y - 2, { fit: [24, 24] });
  } catch { /* The name remains as a text masthead if the logo is absent. */ }
  copy(site.name, M + 31, y + 1, 210, "SerifItalic", 15, 0);
  const issueShort = issue
    ? "VOL. " + issue.volume + " · NO. " + issue.number + " · " + issue.label.toUpperCase()
    : "A SCIENCE JOURNAL FOR EVERYONE";
  copy((post.articleType || "Research article").toUpperCase(), PAGE_W - M - 225, y, 225, "SansBold", 7.5, 0, "right", C.muted);
  copy(issueShort + (post.articleCode ? " · " + post.articleCode : ""), PAGE_W - M - 245, y + 12, 245,
    "Sans", 6.7, 0, "right", C.muted);
  y += 31;
  rule(y);
  y += 14;
  y = copy(post.title, M, y, W, "SerifMedium", 23, 2);
  y += 3;
  y = copy(post.excerpt, M, y, W, "SerifItalic", 11.7, 2, "left", C.muted);
  y += 11;
  const published = post.publishedAt
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(post.publishedAt))
    : "Unpublished";
  y = copy(post.author + " · " + site.name + " · Published " + published, M, y, W, "SansMedium", 8, 1);
  y += 14;
  rule(y);
  y += 12;

  const feature = articleFeatures(post);
  const abstract = post.abstract?.length
    ? post.abstract
    : feature.atAGlance
      ? [{ label: "What we know", text: feature.atAGlance.known },
        { label: "What we don't know", text: feature.atAGlance.unknown },
        { label: "What to watch", text: feature.atAGlance.watch }]
      : [];
  for (const item of abstract) {
    const label = item.label.replace(/[.\s]+$/, "") + ".";
    const combined = label + "  " + item.text;
    const h = height(combined, W, "Sans", 8.35, 2);
    if (y + h + 6 > BOTTOM) newPage();
    y = copy(combined, M, y, W, "Sans", 8.35, 2);
    y += 6;
  }
  if (abstract.length) { y += 5; rule(y); y += 10; }

  const events: Piece[] = [];
  const splitText = (value: string, kind: "text" | "quote" = "text") => {
    const words = value.trim().split(/\s+/).filter(Boolean);
    // Short fragments permit balanced columns and avoid a giant paragraph
    // running over the bottom edge of a page.
    for (let i = 0; i < words.length; i += 53) {
      events.push({ kind, text: words.slice(i, i + 53).join(" "), continuation: i > 0 });
    }
  };
  for (const block of splitContent(post.content)) {
    if (block.type === "chart") {
      events.push({ kind: "chart", spec: block.spec });
      continue;
    }
    for (const node of parse(block.content).children || []) {
      if (node.type === "heading") {
        events.push({ kind: "heading", text: asText(node) });
      } else if (node.type === "paragraph") {
        const textValue = asText(node);
        if (textValue) splitText(textValue);
        for (const fig of imagesIn(node)) {
          if (fig.url) events.push({ kind: "figure", source: fig.url, alt: fig.alt || "", title: fig.title || "" });
        }
      } else if (node.type === "image" && node.url) {
        events.push({ kind: "figure", source: node.url, alt: node.alt || "", title: node.title || "" });
      } else if (node.type === "blockquote") {
        splitText(asText(node), "quote");
      } else if (node.type === "list") {
        for (const [index, item] of (node.children || []).entries()) {
          const prefix = node.ordered ? String((node.start || 1) + index) + ". " : "• ";
          splitText(prefix + asText(item));
        }
      } else if (node.type === "table") {
        events.push({
          kind: "table",
          rows: (node.children || []).map((row) => (row.children || []).map(asText)),
        });
      } else if (node.type === "html" && node.value) {
        const value = node.value.replace(/<[^>]+>/g, "").trim();
        if (value) splitText(value);
      }
    }
  }

  type TextPiece = Extract<Piece, { kind: "text" | "heading" | "quote" }>;
  const pending: TextPiece[] = [];
  const params = (part: TextPiece) => {
    if (part.kind === "heading")
      return { face: "SansBold", size: 10.25, gap: 2.5, above: 8 };
    if (part.kind === "quote")
      return { face: "SerifItalic", size: 10.2, gap: 3, above: 5 };
    return { face: "Serif", size: 9.7, gap: part.continuation ? 0 : 7, above: 0 };
  };
  const pieceHeight = (part: TextPiece) => {
    const p = params(part);
    return height(part.text, CW, p.face, p.size, 2.4) + p.gap + p.above;
  };
  const placePiece = (part: TextPiece, x: number, yy: number) => {
    const p = params(part);
    const top = yy + p.above;
    return copy(part.text, x, top, CW, p.face, p.size, 2.4,
      part.kind === "text" ? "justify" : "left") + p.gap;
  };
  const flushColumns = () => {
    const queue = pending.splice(0);
    while (queue.length) {
      if (y > BOTTOM - 70) newPage();
      const available = BOTTOM - y;
      const sum = queue.reduce((total, part) => total + pieceHeight(part), 0);
      const target = Math.min(available, Math.max(35, sum / 2));
      const ys = [y, y];
      let placed = 0;
      for (let col = 0; col < 2; col++) {
        while (queue.length) {
          const part = queue[0], h = pieceHeight(part);
          const used = ys[col] - y;
          if (h > BOTTOM - ys[col]) break;
          if (part.kind === "heading" && queue.length > 1 &&
              h + pieceHeight(queue[1]) > BOTTOM - ys[col]) break;
          if (col === 0 && used > 0 && used + h > target && queue.length > 1) break;
          queue.shift();
          ys[col] = placePiece(part, M + col * (CW + GAP), ys[col]);
          placed++;
        }
      }
      if (!placed) {
        if (y <= TOP + 1) throw new Error("An article paragraph does not fit on an A4 page.");
        newPage();
        continue;
      }
      y = Math.max(...ys) + 8;
      if (queue.length) newPage();
    }
  };

  const figureCaption = (alt: string, title: string) => {
    const a = clean(alt).trim(), t = clean(title).trim();
    if (!t) return a;
    if (!a || t.toLowerCase().startsWith(a.toLowerCase())) return t;
    // If both fields carry a Figure N. prefix, prefer the longer title.
    if (/^Figure \d+\./i.test(a) && /^Figure \d+\./i.test(t)) return t;
    return a + " " + t;
  };
  const renderFigure = async (part: Extract<Piece, { kind: "figure" }>) => {
    const img = await imageBuffer(part.source);
    if (!img) {
      // Do not silently publish another download full of broken-figure notices.
      throw new Error("Unable to load the published article figure: " + part.source);
    }
    const meta = await sharp(img).metadata();
    const ratio = (meta.height || 1) / (meta.width || 1);
    const imageH = Math.min(224, Math.max(112, W * ratio));
    const caption = figureCaption(part.alt, part.title);
    const capH = caption ? height(caption, W - 38, "Sans", 7.4, 1.5) : 0;
    const total = imageH + capH + 29;
    if (y + total > BOTTOM) newPage();
    rule(y);
    const top = y + 10;
    doc.image(img, M, top, { fit: [W, imageH], align: "center", valign: "center" });
    y = top + imageH + 5;
    if (caption) y = copy(caption, M + 36, y, W - 36, "Sans", 7.4, 1.5);
    y += 14;
  };

  const renderTable = (rows: string[][]) => {
    if (!rows.length) return;
    const count = Math.max(1, ...rows.map((row) => row.length));
    const widths = count === 5
      ? [0.24, 0.21, 0.21, 0.17, 0.17].map((n) => n * W)
      : Array.from({ length: count }, (_, i) => i === 0 ? W * 0.30 : W * 0.70 / (count - 1 || 1));
    const oneRow = (row: string[], header: boolean) => {
      const heights = widths.map((cw, i) => height(row[i] || "", cw - 9,
        header ? "SansBold" : i === 0 ? "SansBold" : "Sans", header ? 7.25 : 7.45, 1.4));
      const h = Math.max(14, ...heights) + 9;
      if (y + h + 8 > BOTTOM) newPage();
      rule(y);
      let x = M;
      for (let i = 0; i < count; i++) {
        const v = header ? (row[i] || "").toUpperCase() : (row[i] || "");
        copy(v, x + 3, y + 5, widths[i] - 9,
          header || i === 0 ? "SansBold" : "Sans",
          header ? 7.25 : 7.45, 1.4);
        x += widths[i];
      }
      y += h;
    };
    if (y > BOTTOM - 120) newPage();
    rows.forEach((row, i) => oneRow(row, i === 0));
    rule(y);
    y += 15;
  };

  const renderChart = (spec: Extract<Piece, { kind: "chart" }>["spec"]) => {
    const rows = spec.data || [];
    if (!rows.length) return;
    const barH = Math.max(16, Math.min(23, 140 / rows.length));
    const chartH = 47 + rows.length * barH;
    if (y + chartH + 15 > BOTTOM) newPage();
    rule(y);
    y += 10;
    y = copy(spec.title, M, y, W, "SansBold", 9.5, 1.6) + 4;
    if (spec.description) y = copy(spec.description, M, y, W, "Sans", 7.6, 1.5, "left", C.muted) + 5;
    const maximum = Math.max(1, spec.yMax || 0, ...rows.map((row) => Number(row.value) || 0));
    const labelW = 150;
    for (const row of rows) {
      const val = Number(row.value) || 0;
      copy(row.name, M, y + 2, labelW - 6, "Sans", 7.2, 1);
      doc.save().rect(M + labelW, y + 2, (W - labelW - 56) * Math.max(0, val / maximum), 8)
        .fill(C.teal).restore();
      copy(String(val) + (spec.unit ? " " + spec.unit : ""), PAGE_W - M - 51, y + 1, 51,
        "SansMedium", 7.1, 1, "right");
      y += barH;
    }
    y += 14;
  };

  for (const event of events) {
    if (event.kind === "text" || event.kind === "heading" || event.kind === "quote") {
      pending.push(event);
      continue;
    }
    flushColumns();
    if (event.kind === "figure") await renderFigure(event);
    else if (event.kind === "table") renderTable(event.rows);
    else if (event.kind === "chart") renderChart(event.spec);
  }
  flushColumns();

  // Reference end matter is also two-column, exactly as in the supplied print.
  const refs = post.references ?? CITATIONS_BY_SLUG[post.slug] ?? [];
  if (refs.length) {
    const half = Math.ceil(refs.length / 2);
    const cells = refs.map((ref) =>
      String(ref.id) + ". " + ref.title + ". " + ref.detail + (ref.url ? " " + ref.url : ""));
    const perColumn = [
      cells.slice(0, half), cells.slice(half),
    ];
    const columnHeights = perColumn.map((col) =>
      col.reduce((sum, item) => sum + height(item, CW - 12, "Sans", 7.55, 1.9) + 6, 0));
    if (y + Math.max(...columnHeights) + 55 > BOTTOM) newPage();
    rule(y);
    y += 11;
    y = copy("REFERENCES", M, y, W, "SansBold", 8, 0) + 10;
    const start = y;
    for (let col = 0; col < 2; col++) {
      let ry = start;
      for (const item of perColumn[col]) {
        if (ry + height(item, CW - 12, "Sans", 7.55, 1.9) > BOTTOM) {
          newPage();
          ry = TOP;
        }
        ry = copy(item, M + col * (CW + GAP) + 8, ry, CW - 12, "Sans", 7.55, 1.9) + 7;
      }
      y = Math.max(y, ry);
    }
    y += 10;
  }
  if (y > BOTTOM - 25) newPage();
  rule(y);
  y = copy("This article explains published research for a general audience. It is not medical advice. © " +
    new Date().getUTCFullYear() + " " + site.name + ". Free to read.", M, y + 9, W, "Sans", 7.3, 1.1, "left", C.muted);

  // Fixed folios: consistent running footer and real page count.
  const pages = doc.bufferedPageRange();
  for (let page = pages.start; page < pages.start + pages.count; page++) {
    doc.switchToPage(page);
    rule(798);
    const imprint = issue
      ? (site.name + " · VOL. " + issue.volume + " · NO. " + issue.number + " · " + issue.label).toUpperCase()
      : site.name.toUpperCase();
    copy(imprint, M, 805, W - 65, "Sans", 6.6, 0, "left", C.muted);
    copy(String(page + 1) + " / " + String(pages.count), PAGE_W - M - 60, 805,
      60, "Sans", 6.6, 0, "right", C.muted);
  }
  doc.end();
  return complete;
}
