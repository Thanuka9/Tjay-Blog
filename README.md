# The Assay

A clean editorial blog for measuring health and longevity claims against the actual research, plus an editor dashboard to write, edit, and unpublish pieces.

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

The first article, *Are peptides the real future of longevity?*, is already published.

## Writing

Posts are Markdown. In the editor toolbar you can upload images and insert bar or line charts. Charts live in the body as:

```md
:::chart
{"type":"bar","title":"Title","data":[{"name":"A","value":3}]}
:::
```

Content is stored in `data/posts.json` and `data/content/`. Uploaded images go to `public/uploads/`.
