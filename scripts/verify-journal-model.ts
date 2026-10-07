import assert from "node:assert/strict";
import {
  articleIssueId,
  journalCitations,
  journalIssues,
  issuePath,
} from "../src/lib/issues";
import type { Issue, Post } from "../src/lib/types";

const issue: Issue = {
  id: "2027-01",
  year: 2027,
  month: 1,
  volume: 1,
  number: 1,
  status: "published",
  editorLetter: "Editor’s introduction",
  editorName: "Tommaso Gioacchini",
  coverDescription: "Test cover",
  coverImage: null,
  fullIssuePdf: null,
};
const post: Post = {
  id: "one",
  slug: "viral-peptides",
  title: "Viral Peptides",
  excerpt: "A test article for model validation",
  author: "Tommaso Gioacchini",
  status: "published",
  featured: false,
  coverImage: null,
  topic: "peptides",
  tags: [],
  publishedAt: "2027-01-05T00:00:00Z",
  createdAt: "2027-01-01T00:00:00Z",
  updatedAt: "2027-01-05T00:00:00Z",
  readingTime: 12,
  content: "## Evidence\n\nArticle content",
  issueId: issue.id,
  sequence: 2,
  articleCode: "AB-0102",
};
const second: Post = {
  ...post,
  id: "two",
  slug: "another",
  title: "Earlier in reading order",
  sequence: 1,
  articleCode: "AB-0101",
  publishedAt: "2027-01-19T00:00:00Z",
};
const draft: Post = { ...post, id: "draft", status: "draft" };
const resolved = journalIssues([post, second, draft], [issue]);
assert.deepEqual(
  resolved[0].posts.map((post) => post.id),
  ["two", "one"],
  "Issue order must override publication order and omit drafts",
);
assert.equal(
  journalIssues([post], [{ ...issue, status: "draft" }]).length,
  0,
  "Draft issues must be hidden",
);
assert.equal(
  journalIssues([{ ...post, issueId: null }], [issue])[0].posts.length,
  0,
  "An unassigned article must not fall back into a month",
);
assert.equal(
  articleIssueId({ ...post, issueId: undefined }),
  "2027-01",
  "Legacy published articles retain monthly issue membership",
);
assert.equal(issuePath(issue), "/issues/2027/01");
assert.equal(
  journalCitations(post, issue).vancouver,
  "Gioacchini T. Viral Peptides. The Abyss. 2027;1(1):AB-0102.",
);
assert.equal(
  journalCitations({ ...post, citation: "Custom correction citation" }, issue)
    .vancouver,
  "Custom correction citation",
);
console.log(
  "Journal membership, status filtering, sequence, route, and citation checks passed.",
);
