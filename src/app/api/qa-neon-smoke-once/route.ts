import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

const DATA_API_URL =
  "https://ep-steep-salad-b7nhnbdu.apirest.c-13.us-east-1.aws.neon.tech/the_abyss/rest/v1";

export async function GET() {
  try {
    const sql = db();
    const rows = await sql`
      SELECT id, slug, status, published_at, title
      FROM articles
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const runtimeHeaders = await headers();
    const token = runtimeHeaders.get("x-vercel-oidc-token") || process.env.VERCEL_OIDC_TOKEN || "";
    const rawResponse = await fetch(`${DATA_API_URL}/rpc/app_sql`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sql_text:
          "SELECT id, slug, status, published_at, title FROM articles ORDER BY created_at DESC LIMIT 5",
      }),
      cache: "no-store",
    });
    const rawText = await rawResponse.text();
    let rawPayload: unknown = rawText;
    try {
      rawPayload = JSON.parse(rawText);
    } catch {
      // Keep text form for diagnostics.
    }

    return NextResponse.json({
      ok: true,
      dataBackend: process.env.DATA_BACKEND || null,
      neonDataApiConfigured: Boolean(process.env.NEON_DATA_API_URL),
      helperRowCount: rows.length,
      helperRows: rows,
      rawStatus: rawResponse.status,
      rawIsArray: Array.isArray(rawPayload),
      rawPayload,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Neon diagnostic failed" },
      { status: 500 },
    );
  }
}
