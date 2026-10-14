import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DATA_API = "https://ep-steep-salad-b7nhnbdu.apirest.c-13.us-east-1.aws.neon.tech/the_abyss/rest/v1";

function decodePayload(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  const token = request.headers.get("x-vercel-oidc-token") || process.env.VERCEL_OIDC_TOKEN || "";
  if (!token) return NextResponse.json({ ok: false, stage: "oidc", error: "missing-token" }, { status: 500 });

  const claims = decodePayload(token);
  const response = await fetch(`${DATA_API}/rpc/app_sql`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ sql_text: "SELECT 1 AS ok" }),
    cache: "no-store",
  });
  const body = await response.text();

  return NextResponse.json({
    ok: response.ok,
    oidc: {
      iss: claims.iss ?? null,
      sub: claims.sub ?? null,
      aud: claims.aud ?? null,
    },
    neon: {
      status: response.status,
      detail: body.slice(0, 500),
    },
  }, { status: response.ok ? 200 : 500 });
}
