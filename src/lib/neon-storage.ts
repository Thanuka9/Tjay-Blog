import "server-only";

import { AwsClient } from "aws4fetch";

let client: AwsClient | null = null;

type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function config(): StorageConfig {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.trim().replace(/\/$/, "");
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const region = process.env.AWS_REGION?.trim() || "us-east-1";
  const bucket = process.env.NEON_STORAGE_BUCKET?.trim() || "the-abyss-media";

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Neon Object Storage is not configured. Set AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.",
    );
  }

  return { endpoint, region, bucket, accessKeyId, secretAccessKey };
}

function storageClient() {
  const current = config();
  client ??= new AwsClient({
    accessKeyId: current.accessKeyId,
    secretAccessKey: current.secretAccessKey,
    service: "s3",
    region: current.region,
  });
  return { client, current };
}

function encodedKey(key: string) {
  return key
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function neonObjectUrl(key: string) {
  const { endpoint, bucket } = config();
  return `${endpoint}/${encodeURIComponent(bucket)}/${encodedKey(key)}`;
}

export async function putNeonObject(
  key: string,
  body: Uint8Array | ArrayBuffer,
  contentType: string,
) {
  const { client: signer } = storageClient();
  const url = neonObjectUrl(key);
  const payload: ArrayBuffer =
    body instanceof ArrayBuffer
      ? body
      : (Uint8Array.from(body).buffer as ArrayBuffer);
  const response = await signer.fetch(url, {
    method: "PUT",
    body: payload,
    headers: { "content-type": contentType },
  });
  if (!response.ok) {
    throw new Error(`Neon Object Storage upload failed (${response.status}).`);
  }
  return url;
}

export async function deleteNeonObject(key: string) {
  const { client: signer } = storageClient();
  const response = await signer.fetch(neonObjectUrl(key), { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Neon Object Storage delete failed (${response.status}).`);
  }
}

export function neonObjectKeyFromUrl(value: string) {
  try {
    const { endpoint, bucket } = config();
    const base = new URL(endpoint);
    const url = new URL(value);
    if (url.origin !== base.origin) return null;
    const prefix = `/${encodeURIComponent(bucket)}/`;
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
