import "server-only";
import { AwsClient } from "aws4fetch";

const DEFAULT_ENDPOINT =
  "https://br-proud-unit-b70xhjbq.storage.c-13.us-east-1.aws.neon.tech";
const DEFAULT_BUCKET = "the-abyss-media";

function endpoint() {
  return (process.env.AWS_ENDPOINT_URL_S3?.trim() || DEFAULT_ENDPOINT).replace(/\/$/, "");
}

function bucket() {
  return process.env.NEON_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET;
}

function storageClient() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Neon Object Storage credentials are not configured.");
  }
  return new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: process.env.AWS_REGION?.trim() || "us-east-1",
  });
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
  const payload: ArrayBuffer =
    body instanceof ArrayBuffer
      ? body
      : (Uint8Array.from(body).buffer as ArrayBuffer);
  const response = await storageClient().fetch(neonObjectUrl(key), {
    method: "PUT",
    headers: { "content-type": contentType },
    body: payload,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Neon Object Storage upload failed (${response.status}): ${detail.slice(0, 300)}`,
    );
  }
  return neonObjectUrl(key);
}

export async function deleteNeonObject(key: string) {
  const response = await storageClient().fetch(neonObjectUrl(key), {
    method: "DELETE",
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
