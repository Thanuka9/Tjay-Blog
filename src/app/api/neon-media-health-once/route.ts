import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = (process.env.NEON_STORAGE_PROXY_URL?.trim() || "https://br-proud-unit-b70xhjbq-storageproxy.compute.c-13.us-east-1.aws.neon.tech").replace(/\/$/, "");
  const token = process.env.NEON_STORAGE_PROXY_TOKEN?.trim() || process.env.MIGRATION_RUN_TOKEN?.trim();
  if (!token) return NextResponse.json({ ok: false, error: "proxy token missing" }, { status: 500 });

  const paths = ["", "/object", "/objects", "/upload", "/storage", "/put", "/api/object", "/api/upload", "/v1/object"];
  const results: Array<{ path: string; status: number; detail: string }> = [];
  const key = "qa/cutover-path-probe.txt";

  for (const path of paths) {
    try {
      const response = await fetch(`${base}${path}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "text/plain; charset=utf-8",
          "x-object-key": key,
        },
        body: "The Abyss Neon proxy route probe",
        cache: "no-store",
      });
      const detail = (await response.text()).slice(0, 160);
      results.push({ path: path || "/", status: response.status, detail });
      if (response.ok) {
        await fetch(`${base}${path}`, {
          method: "DELETE",
          headers: { authorization: `Bearer ${token}`, "x-object-key": key },
          cache: "no-store",
        });
        return NextResponse.json({ ok: true, path: path || "/", status: response.status, detail });
      }
    } catch (error) {
      results.push({ path: path || "/", status: 0, detail: error instanceof Error ? error.message : "fetch failed" });
    }
  }

  return NextResponse.json({ ok: false, results }, { status: 500 });
}
