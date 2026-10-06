import PDFDocument from "pdfkit";
import { splitContent } from "@/lib/content";
import { CITATIONS_BY_SLUG } from "@/lib/citations";
import { formatDate, site } from "@/lib/site";
import type { Post } from "@/lib/types";
import type { JournalIssue } from "@/lib/issues";

function plain(text: string) {
  return text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "[Image: $1 — $2]")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/<[^>]+>/g, "").replace(/\*\*|__|`/g, "")
    .replace(/\[\^(\d+)\]/g, "[$1]");
}

export async function journalPdf(posts: Post[], issue?: JournalIssue, contentsOnly = false): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 54, bufferPages: true, info: { Title: issue ? `${site.name} — ${issue.label}` : posts[0].title, Author: site.name } });
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolve, reject) => { doc.on("data", chunk => chunks.push(chunk)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  function text(value: string, size = 11, heading = false) {
    doc.font(heading ? "Times-Bold" : "Times-Roman").fontSize(size).fillColor("#0d1c3b").text(plain(value), { lineGap: 4 });
    doc.moveDown(.6);
  }
  if (issue) {
    text(site.name, 48, true); text(site.tagline, 15);
    text(`${issue.label} · Volume ${issue.volume}, Number ${issue.number}`, 15);
    doc.moveDown(2); text("Table of contents", 24, true);
    for (const post of posts) { text(post.title, 15, true); text(`${post.author} · ${formatDate(post.publishedAt)}`, 10); }
  }
  if (!contentsOnly) for (const post of posts) {
    if (issue || post !== posts[0]) doc.addPage();
    text(site.name, 14, true); text(post.topic.toUpperCase(), 10);
    text(post.title, 28, true); text(post.excerpt, 13);
    text(`${post.author} · ${formatDate(post.publishedAt)} · ${post.readingTime} min read`, 10);
    doc.moveDown();
    for (const block of splitContent(post.content)) {
      if (block.type === "chart") {
        text(block.spec.title, 16, true);
        if (block.spec.description) text(block.spec.description);
        const labels = block.spec.seriesLabels ?? ["Value", "Value 2", "Value 3"];
        text(`Chart data${block.spec.unit ? ` (${block.spec.unit})` : ""}`, 10, true);
        for (const row of block.spec.data) text(`${row.name}: ${[row.value, row.value2, row.value3].map((value, index) => value === undefined ? null : `${labels[index] ?? `Series ${index + 1}`}: ${value}`).filter(Boolean).join("; ")}`, 10);
      } else {
        for (const paragraph of block.content.split(/\n\s*\n/).filter(value => value.trim())) {
          const heading = paragraph.match(/^(#{1,6})\s+([\s\S]*)/);
          if (heading) {
            if (doc.y > doc.page.height - 140) doc.addPage();
            text(heading[2], heading[1].length <= 2 ? 19 : 14, true);
          } else text(paragraph);
        }
      }
    }
    const citations = CITATIONS_BY_SLUG[post.slug] ?? [];
    if (citations.length) { text("References", 20, true); for (const citation of citations) text(`${citation.id}. ${citation.title}. ${citation.detail}\n${citation.url}`, 10); }
  }
  const range = doc.bufferedPageRange();
  for (let page = range.start; page < range.start + range.count; page++) {
    doc.switchToPage(page);
    doc.font("Times-Roman").fontSize(9).fillColor("#4b5365");
    doc.text(`${site.name} · ${page + 1} / ${range.count}`, 54, 805, { lineBreak: false });
  }
  doc.end();
  return completed;
}
