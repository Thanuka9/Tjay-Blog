import { put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");

const STATE_FILES = [
  "posts.json",
  "topics.json",
  "home.json",
  "subscribers.json",
  "outbox.json",
] as const;

const IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
};

function loadEnvFile(filePath: string) {
  return fs.readFile(filePath, "utf8").then(
    (raw) => {
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq < 1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = value;
      }
    },
    () => {
      // Optional local env file.
    },
  );
}

async function readOptional(filePath: string) {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

async function listFiles(dir: string) {
  try {
    const names = await fs.readdir(dir);
    return names.filter((name) => name !== ".gitkeep");
  } catch {
    return [];
  }
}

function referencedNames(text: string) {
  return [...text.matchAll(/(?:\/api)?\/uploads\/([A-Za-z0-9._-]+)/g)].map(
    (match) => match[1],
  );
}

function rewriteUploads(text: string, urls: Map<string, string>) {
  return text.replace(
    /(?:\/api)?\/uploads\/([A-Za-z0-9._-]+)/g,
    (match, name: string) => urls.get(name) ?? match,
  );
}

async function main() {
  await loadEnvFile(path.join(ROOT, ".env.local"));
  await loadEnvFile(path.join(ROOT, ".env"));

  const privateToken = process.env.BLOB_PRIVATE_READ_WRITE_TOKEN?.trim();
  const publicToken = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN?.trim();
  if (!privateToken || !publicToken) {
    console.error(
      "Set both BLOB_PRIVATE_READ_WRITE_TOKEN and BLOB_PUBLIC_READ_WRITE_TOKEN before running the migration. Keep the real values only in Vercel environment variables, .env.local, or your shell; never commit them.",
    );
    process.exit(1);
  }

  const postsRaw = await readOptional(path.join(DATA, "posts.json"));
  if (!postsRaw) {
    console.error("data/posts.json was not found.");
    process.exit(1);
  }

  const postsText = postsRaw.toString("utf8");
  const contentDir = path.join(DATA, "content");
  const contentNames = (await listFiles(contentDir)).filter((name) =>
    name.endsWith(".md"),
  );
  const contents = new Map<string, string>();
  for (const name of contentNames) {
    contents.set(
      name,
      (await fs.readFile(path.join(contentDir, name))).toString("utf8"),
    );
  }

  const coverNames = new Set(referencedNames(postsText));
  const bodyNames = new Set(
    [...contents.values()].flatMap((text) => referencedNames(text)),
  );

  const onDisk = new Map<string, string>();
  for (const dir of [
    path.join(DATA, "uploads"),
    path.join(ROOT, "public", "uploads"),
  ]) {
    for (const name of await listFiles(dir)) {
      if (!onDisk.has(name)) onDisk.set(name, path.join(dir, name));
    }
  }

  const urls = new Map<string, string>();
  const needed = new Set([...coverNames, ...bodyNames, ...onDisk.keys()]);
  for (const name of needed) {
    const filePath = onDisk.get(name);
    if (!filePath) {
      console.warn(`Missing image file for ${name}`);
      continue;
    }
    const folder = coverNames.has(name) ? "covers" : "articles";
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const blob = await put(`tjay/uploads/${folder}/${name}`, await fs.readFile(filePath), {
      access: "public",
      allowOverwrite: true,
      contentType: IMAGE_TYPES[ext] ?? "application/octet-stream",
      token: publicToken,
    });
    urls.set(name, blob.url);
    console.log(`uploaded tjay/uploads/${folder}/${name}`);
  }

  const postsJson = rewriteUploads(postsText, urls);
  await put("tjay/state/posts.json", postsJson.endsWith("\n") ? postsJson : `${postsJson}\n`, {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
    token: privateToken,
  });
  console.log("uploaded tjay/state/posts.json");

  for (const name of STATE_FILES) {
    if (name === "posts.json") continue;
    const raw = await readOptional(path.join(DATA, name));
    if (!raw) {
      console.warn(`Skipped missing data/${name}`);
      continue;
    }
    const text = raw.toString("utf8");
    await put(`tjay/state/${name}`, text.endsWith("\n") ? text : `${text}\n`, {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
      token: privateToken,
    });
    console.log(`uploaded tjay/state/${name}`);
  }

  for (const [name, markdown] of contents) {
    const id = name.replace(/\.md$/, "");
    const next = rewriteUploads(markdown, urls);
    await put(`tjay/content/${id}.md`, next, {
      access: "private",
      allowOverwrite: true,
      contentType: "text/markdown; charset=utf-8",
      token: privateToken,
    });
    console.log(`uploaded tjay/content/${id}.md`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Migration failed.");
  process.exit(1);
});
