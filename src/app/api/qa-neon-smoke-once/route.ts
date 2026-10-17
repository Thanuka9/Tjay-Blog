import { NextResponse } from "next/server";
import { db } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = db();
    const rows = await sql`
      SELECT id, slug, status, published_at, title
      FROM articles
      ORDER BY created_at DESC
      LIMIT 5
    `;
    return NextResponse.json({
      ok: true,
      dataBackend: process.env.DATA_BACKEND || null,
      neonDataApiConfigured: Boolean(process.env.NEON_DATA_API_URL),
      rowCount: rows.length,
      rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        dataBackend: process.env.DATA_BACKEND || null,
        neonDataApiConfigured: Boolean(process.env.NEON_DATA_API_URL),
        error: error instanceof Error ? error.message : "Neon diagnostic failed",
      },
      { status: 500 },
    );
  }
}
