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
import { journalCitations, type JournalIssue } from "@/lib/issues";
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
  PAPER = "#F5F1E8";
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

async function imageBuffer(source: string): Promise<Buffer | null> {
  try {
    let data: Buffer;
    if (source.startsWith("/covers/") || source.startsWith("/uploads/")) {
      const root = path.resolve(process.cwd(), "public");
      const file = path.resolve(root, `.${decodeURIComponent(source)}`);
      if (!file.startsWith(`${root}${path.sep}`)) return null;
      data = await readFile(file);
    } else {
      const url = new URL(source);
      if (
        url.protocol !== "https:" ||
        !url.hostname.endsWith(".public.blob.vercel-storage.com") ||
        url.username ||
        url.password
      )
        return null;
      const response = await fetch(url, {
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });
      if (
        !response.ok ||
        Number(response.headers.get("content-length")) > 10000000
      )
        return null;
      const reader = response.body?.getReader();
      if (!reader) return null;
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > 10000000) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
      data = Buffer.concat(chunks);
    }
    if (data.length > 10000000) return null;
    return await sharp(data, { limitInputPixels: 40000000 })
      .rotate()
      .resize({ width: 1400, withoutEnlargement: true })
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
  })) doc.registerFont(name, await readFile(path.join(process.cwd(), "public/fonts/pdf", file)));
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
      .font(font || (size <= 10 ? heading ? "Journal-Sans-Semibold" : "Journal-Sans" : heading ? "Journal-Serif-Medium" : "Journal-Serif"))
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
  async function image(source: string, alt: string) {
    const data = images.get(source);
    if (!data) {
      text(
        `[Image: ${alt || "Figure"}. View in the online article: ${source}]`,
        9,
      );
      return;
    }
    const metadata = await sharp(data).metadata();
    const height = Math.min(
      300,
      (width * (metadata.height ?? 1)) / (metadata.width ?? 1),
    );
    room(height + 40);
    const y = doc.y;
    doc.image(data, 54, y, { fit: [width, height], align: "center" });
    doc.y = y + height + 12;
    doc.x = 54;
    if (alt) text(alt, 9);
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
        borderColor: "#D8D2C5",
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
            if (img.url) await image(img.url, img.title || img.alt || "");
        break;
      case "list":
        for (const [index, child] of (node.children || []).entries()) {
          const prefix = node.ordered ? `${(node.start || 1) + index}. ` : "• ";
          for (const part of child.children || [])
            await render(part, indent + prefix);
        }
        break;
      case "blockquote":
        text(`“${inline(node)}”`, 13);
        break;
      case "table":
        table(
          (node.children || []).map((row) => (row.children || []).map(inline)),
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
          .strokeColor("#D8D2C5")
          .stroke();
        doc.moveDown();
        break;
      case "image":
        if (node.url) await image(node.url, node.title || node.alt || "");
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
      doc.rect(x, top + 94 - height, stepWidth - 4, height).fill(selected ? TEAL : "#D8E5EB");
      doc.font("Journal-Sans-Semibold").fontSize(8).fillColor(INK).text(stage, x, top + 102, { width: stepWidth - 6 });
      if (selected) doc.fontSize(8).fillColor(TEAL).text("Main evidence", x, top + 137, { width: stepWidth - 6 });
    });
    doc.x = 54;
    doc.y = top + 163;
    text(ladder.caption, 10);
    text("Study design and quality matter at every stage. Regulatory approval is a separate assessment for a specific use.", 9);
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
    text(`Volume ${issue.volume}, Number ${issue.number} · ${issue.label}`, 12);
    const y = doc.y + 14;
    if (coverImage && images.get(coverImage)) {
      doc.save().rect(54, y, width * 0.2, 190).fill("#1B2A55");
      doc.rect(54 + width * 0.2, y, width * 0.8, 190).clip();
      doc.image(images.get(coverImage)!, 54 + width * 0.2, y, { cover: [width * 0.8, 190] });
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
    for (const post of issue.upcomingArticles || []) text(`${post.articleCode}   ${post.title} · Upcoming`, 12, true);
    doc.addPage();
    heading("From the Editor", 24);
    text(
      issue.editorLetter ||
        "Below the headlines, into the evidence. This issue brings together published articles and their sources. Read the research, consider its limits, and follow the evidence at your own pace.",
      12,
    );
    text(`${issue.editorName === site.name ? "TJ" : issue.editorName}, Editor`, 11);
    heading("About the cover", 16);
    text(
      issueCoverDescription(issue),
      10,
    );
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
        text(`Vol. ${issue.volume} | No. ${issue.number} · ${issue.label}`, 10);
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
      }
      else if (features.atAGlance) {
        heading("At a glance", 16);
        for (const [label, body] of [["What we know", features.atAGlance.known], ["What we don’t know", features.atAGlance.unknown], ["What to watch", features.atAGlance.watch]]) {
          text(label, 10, true);
          text(body, 10);
        }
      }
      if (post.coverImage) await image(post.coverImage, "");
      const placement = evidencePlacement(post.content, features.evidenceLadder);
      const headingIds = extractHeadings(post.content).map((heading) => heading.id);
      let headingIndex = 0;
      beforeSection = () => {
        const id = headingIds[headingIndex++];
        if (features.evidenceLadder && placement.before === id) renderLadder(features.evidenceLadder);
      };
      if (features.evidenceLadder && placement.start) renderLadder(features.evidenceLadder);
      for (const block of splitContent(post.content)) {
        if (block.type === "markdown") {
          for (const node of parse(block.content).children || []) {
            await render(node);
          }
        }
        else {
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
                .map((value) => (value === undefined ? "" : String(value))),
            ]),
          ]);
        }
      }
      if (features.evidenceLadder && placement.end) renderLadder(features.evidenceLadder);
      const references = post.references ?? CITATIONS_BY_SLUG[post.slug] ?? [];
      if (references.length) {
        heading("References", 21);
        for (const citation of references)
          text(
            `${citation.id}. ${citation.title}. ${citation.detail}\n${citation.url}`,
            10,
          );
      }
      heading("Cite this article", 16);
      text(journalCitations(post, issue).vancouver, 10);
      text(
        "This article explains published research for a general audience. It is not medical advice.",
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
      .fillColor("#4B5365")
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
