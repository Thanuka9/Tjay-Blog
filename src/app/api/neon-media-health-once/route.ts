import { NextResponse } from "next/server";
import { deleteNeonObject, putNeonObject } from "@/lib/neon-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = "qa/cutover-smoke.txt";
  try {
    const url = await putNeonObject(
      key,
      new TextEncoder().encode("The Abyss Neon media cutover smoke test"),
      "text/plain; charset=utf-8",
    );
    await deleteNeonObject(key);
    return NextResponse.json({ ok: true, storage: "write-delete", neonUrl: url.includes("storage.c-13.us-east-1.aws.neon.tech") });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Neon media smoke failed" },
      { status: 500 },
    );
  }
}
