import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

// Compile just the pure content helpers so checks run with the project's installed tools.
const require = createRequire(import.meta.url);
const output = path.resolve("artifacts/journal-review/model");
mkdirSync(output, { recursive: true });
for (const name of ["site", "charts", "content", "headings", "article-markdown", "article-features", "issues"]) {
  const source = readFileSync(`src/lib/${name}.ts`, "utf8").replace(/"@\/lib\/([^"]+)"/g, '"./$1.cjs"');
  writeFileSync(path.join(output, `${name}.cjs`), ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText);
}
const { extractHeadings } = require(path.join(output, "headings.cjs"));
const { splitContent } = require(path.join(output, "content.cjs"));
const { parseChartRows, normalizeChartSpec } = require(path.join(output, "charts.cjs"));
const { remarkArticle } = require(path.join(output, "article-markdown.cjs"));
const { articleFeatures, evidencePlacement } = require(path.join(output, "article-features.cjs"));
const legacy = articleFeatures({ slug: "are-peptides-the-real-future-of-longevity" });
assert.ok(legacy.atAGlance.known && legacy.evidenceLadder.subject === "BPC-157");
assert.deepEqual(articleFeatures({ slug: "are-peptides-the-real-future-of-longevity", atAGlance: null, evidenceLadder: null }), { atAGlance: null, evidenceLadder: null }, "Disabling features must override legacy defaults");
assert.deepEqual(articleFeatures({ slug: "other-article" }), { atAGlance: null, evidenceLadder: null }, "Other articles must not inherit peptide conclusions");
assert.deepEqual(evidencePlacement("## BPC-157\nText\n## Next", legacy.evidenceLadder), { start: false, before: "next", end: false });
assert.deepEqual(evidencePlacement("## BPC-157", legacy.evidenceLadder), { start: false, before: null, end: true });
assert.deepEqual(evidencePlacement("## Renamed", legacy.evidenceLadder), { start: true, before: null, end: false });

const markdown = "## **Evidence** and [limits](https://example.org)\n\n## Evidence and limits\n\n```md\n## Not a section\n```\n\n## Sources heading";
assert.deepEqual(extractHeadings(markdown), [
  { id: "evidence-and-limits", text: "Evidence and limits" },
  { id: "evidence-and-limits-2", text: "Evidence and limits" },
  { id: "sources-heading-2", text: "Sources heading" },
]);
const chart = { type: "bar", title: "Evidence", data: [{ name: "Study", value: 3 }] };
assert.equal(splitContent(`:::chart\n${JSON.stringify(chart)}\n:::`)[0].type, "chart");
assert.equal(splitContent(`\`\`\`markdown\n:::chart\n${JSON.stringify(chart)}\n:::\n\`\`\``)[0].type, "markdown", "Chart examples inside code blocks must stay code");
for (const value of [null, {}, { ...chart, data: null }, { ...chart, data: [{ name: "Study", value: "wrong" }] }]) {
  assert.equal(splitContent(`:::chart\n${JSON.stringify(value)}\n:::`)[0].type, "markdown", "Invalid charts must not crash an article");
}
assert.deepEqual(parseChartRows("Missing,\nInvalid,abc\nValid,2,,4\nZero,0"), [
  { name: "Valid", value: 2, value3: 4 }, { name: "Zero", value: 0 },
]);
assert.equal(normalizeChartSpec({ ...chart, height: -10 }).height, 180);
const tree = { type: "root", children: [
  { type: "paragraph", children: [{ type: "text", value: "Evidence [1], unknown [9]." }, { type: "inlineCode", value: "[1]" }, { type: "link", url: "https://example.org", children: [{ type: "text", value: "[1]" }] }] },
  { type: "heading", depth: 2, children: [{ type: "text", value: "Evidence" }] },
] };
remarkArticle({ headingIds: ["evidence"], citationIds: [1] })(tree);
assert.equal(tree.children[1].data.hProperties.id, "evidence");
assert.equal(tree.children[0].children[1].url, "#ref-1");
assert.ok(tree.children[0].children.some((node) => node.value?.includes("[9]")));
assert.ok(tree.children[0].children.some((node) => node.type === "inlineCode" && node.value === "[1]"));
assert.equal(tree.children[0].children.at(-1).children[0].type, "text");

const journalSource = readFileSync("scripts/verify-journal-model.ts", "utf8").replace('"../src/lib/issues"', '"./issues.cjs"');
const journalFile = path.join(output, "journal-check.cjs");
writeFileSync(journalFile, ts.transpileModule(journalSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText);
require(journalFile);
console.log("Article headings, protected citations, malformed charts, numeric data, and journal model checks passed.");
