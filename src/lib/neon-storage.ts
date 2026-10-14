import "server-only";

const DEFAULT_ENDPOINT =
  "https://br-proud-unit-b70xhjbq.storage.c-13.us-east-1.aws.neon.tech";
const DEFAULT_PROXY =
  "https://br-proud-unit-b70xhjbq-storageproxy.compute.c-13.us-east-1.aws.neon.tech/";
const DEFAULT_BUCKET = "the-abyss-media";

function endpoint() {
  return (process.env.AWS_ENDPOINT_URL_S3?.trim() || DEFAULT_ENDPOINT).replace(/\/$/, "");
}

function bucket() {
  return process.env.NEON_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET;
}

function proxyConfig() {
  const url = (process.env.NEON_STORAGE_PROXY_URL?.trim() || DEFAULT_PROXY).replace(/\/$/, "");
  const token =
    process.env.NEON_STORAGE_PROXY_TOKEN?.trim() ||
    process.env.MIGRATION_RUN_TOKEN?.trim();
  if (!token) {
    throw new Error("Neon storage proxy token is not configured.");
  }
  return { url, token };
}

function encodedKey(key: string) {
  return key
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function neonObjectUrl(key: string) {
  return `${endpoint()}/${encodeURIComponent(bucket())}/${encodedKey(key)}`;
}

export async function putNeonObject(
  key: string,
  body: Uint8Array | ArrayBuffer,
  contentType: string,
) {
  const { url, token } = proxyConfig();
  const payload: ArrayBuffer =
    body instanceof ArrayBuffer
      ? body
      : (Uint8Array.from(body).buffer as ArrayBuffer);
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": contentType,
      "x-object-key": key,
    },
    body: payload,
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Neon Object Storage upload failed (${response.status}): ${detail.slice(0, 300)}`,
    );
  }
  const result = (await response.json()) as { url?: string };
  return result.url || neonObjectUrl(key);
}

export async function deleteNeonObject(key: string) {
  const { url, token } = proxyConfig();
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${token}`,
      "x-object-key": key,
    },
    cache: "no-store",
  });
  if (!response.ok && response.status !== 404) {
    const detail = await response.text();
    throw new Error(
      `Neon Object Storage delete failed (${response.status}): ${detail.slice(0, 300)}`,
    );
  }
}

export function neonObjectKeyFromUrl(value: string) {
  try {
    const base = new URL(endpoint());
    const url = new URL(value);
    if (url.origin !== base.origin) return null;
    const prefix = `/${encodeURIComponent(bucket())}/`;
    if (!url.pathname.startsWith(prefix)) return null;
    return url.pathname
      .slice(prefix.length)
      .split("/")
      .map((part) => decodeURIComponent(part))
      .join("/");
  } catch {
    return null;
  }
}
