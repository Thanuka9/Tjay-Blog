# The Abyss

A monthly digital science journal with editable issues, research articles, citations, and free journal and article PDFs, plus an editor dashboard to maintain the publication.

## Run it

```bash
cd the-assay
npm install
cp .env.example .env.local
```

Set `ADMIN_PASSWORD` and `AUTH_SECRET` in `.env.local`, then:

```bash
npm run dev
```

- Site: [http://localhost:3000](http://localhost:3000)
- Editor desk: [http://localhost:3000/admin](http://localhost:3000/admin)

The first article, _Are peptides the real future of longevity?_, is already published.

## Writing

Posts are Markdown. In the editor toolbar you can upload images and insert bar or line charts. Charts live in the body as:

```md
:::chart
{"type":"bar","title":"Title","data":[{"name":"A","value":3}]}
:::
```

Live posts, issues, topics, subscribers, and article files are stored in Vercel Blob, not in `data/`. The `data/` folder is only the source for a one-time copy. After the private and public Blob tokens are set, run `npm run migrate:blob` on this machine, where the original images still exist.

## Journal issues

The publication is organized around monthly journal issues. Visit `/admin/issues` to create or edit an issue, set its volume and number, upload its cover, write the editor's letter, and select articles in reading order. Draft issues stay private. The most recent published issue leads the homepage.

Each article can have an issue, article number (such as `AB-0101`), article type, reading order, and optional custom citation. Existing articles retain their original URLs and publication dates. Older articles appear in monthly issues until editors set their formal issue metadata. Saving an issue persists its assignments and article numbers.

Public routes include `/current-issue`, `/issues`, `/issues/YYYY/MM`, `/newsletter`, `/editorial-standards`, and `/corrections`. Existing `/archive`, `/issues/YYYY-MM`, and `/issues/current` addresses redirect to the journal routes.

Download a journal at `/issues/YYYY/MM/download` or an article at `/articles/SLUG/download`. Generated PDFs use the same Markdown and references as the website, with available cover/body images and chart data tables. Full issues include a cover, editor's letter, table of contents, ordered articles, and publication information. Optional external PDF URLs can be set in the editor; these files need to be maintained by the editor when content changes.

Issue records live in the private Blob store at `tjay/state/issues.json`. Use `BLOB_PRIVATE_READ_WRITE_TOKEN` for publication data and `BLOB_PUBLIC_READ_WRITE_TOKEN` for uploaded images. Set `SITE_URL=https://theabyssos.com` in production and optionally `EDITORIAL_EMAIL` to show an editorial contact on the Corrections page. No ISSN is invented or assigned by the app.

Validation scripts: `scripts/verify-journal-model.ts` checks issue membership, draft visibility, reading order, and citations; `scripts/verify-journal.py` checks a running journal's palette, routes, citation dialog, mobile layout, and PDF contents. The browser script requires Python Playwright, PyMuPDF, and Microsoft Edge, and defaults to `http://localhost:3100` (override with `JOURNAL_TEST_URL`).
