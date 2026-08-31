const encoder = new TextEncoder();

export const SESSION_COOKIE = "assay_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function bytesToHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToHex(signature);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function createSessionToken(secret: string) {
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = String(expires);
  const signature = await hmac(payload, secret);
  return `${payload}.${signature}`;
}

export async function isValidSessionToken(
  token: string | undefined,
  secret: string,
) {
  if (!token || !secret) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expires = Number(payload);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  const expected = await hmac(payload, secret);
  return timingSafeEqual(signature, expected);
}

export function isValidPassword(password: string, expected: string) {
  if (!expected || password.length !== expected.length) return false;
  return timingSafeEqual(password, expected);
}
