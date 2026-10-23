import { upfFigureSvg } from "@/lib/upf-figures";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: {params: Promise<{ name: string }>}) {
  const {name}=await params;
  if (!/^upf-[1-6]$/.test(name)) return new Response("Not found", {status:404});
  const data=upfFigureSvg(name);
  if(!data) return new Response("Not found",{status:404});
  return new Response(new Uint8Array(data),{
    headers: {
      "Content-Type":"image/svg+xml; charset=utf-8",
      "Cache-Control":"public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options":"nosniff"
    }
  });
}
