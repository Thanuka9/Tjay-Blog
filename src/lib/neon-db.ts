import "server-only";

import { headers } from "next/headers";

const DEFAULT_DATA_API_URL =
  "https://ep-steep-salad-b7nhnbdu.apirest.c-13.us-east-1.aws.neon.tech/the_abyss/rest/v1";

type SqlValue =
  | string
  | number
  | boolean
  | bigint
  | Date
  | null
  | undefined;

function literal(value: SqlValue) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Invalid numeric SQL value.");
    return String(value);
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return `'${text.replaceAll("'", "''")}'`;
}

async function oidcToken() {
  const runtimeHeaders = await headers();
  const token =
    runtimeHeaders.get("x-vercel-oidc-token") ||
    process.env.VERCEL_OIDC_TOKEN?.trim();
  if (!token) {
    throw new Error("Vercel OIDC token is unavailable for Neon access.");
  }
  return token;
}

export function db() {
  return async function sql(
    strings: TemplateStringsArray,
    ...values: SqlValue[]
  ): Promise<Record<string, unknown>[]> {
    let statement = strings[0] ?? "";
    for (let index = 0; index < values.length; index += 1) {
      statement += literal(values[index]);
      statement += strings[index + 1] ?? "";
    }

    const base =
      process.env.NEON_DATA_API_URL?.trim().replace(/\/$/, "") ||
      DEFAULT_DATA_API_URL;
    const token = await oidcToken();
    const response = await fetch(`${base}/rpc/app_sql`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ sql_text: statement }),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Neon query failed (${response.status}): ${detail.slice(0, 500)}`,
      );
    }

    const payload = (await response.json()) as unknown;
    return Array.isArray(payload)
      ? (payload as Record<string, unknown>[])
      : [];
  };
}
