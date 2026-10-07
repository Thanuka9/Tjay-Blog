import { downloadResponse } from "@/lib/downloads";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; month: string }> },
) {
  const { id, month } = await params;
  if (!/^\d{4}$/.test(id) || !/^(0[1-9]|1[0-2])$/.test(month))
    return new Response("Not found", { status: 404 });
  return downloadResponse("issue", `${id}-${month}`);
}
