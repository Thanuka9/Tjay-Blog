import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
};

function safeName(name: string) {
  const base = path.basename(name);
  if (!/^[A-Za-z0-9._-]+$/.test(base)) return null;
  return base;
}

async function findFile(name: string) {
  const dataPath = path.join(process.cwd(), "data", "uploads", name);
  const publicPath = path.join(process.cwd(), "public", "uploads", name);
  try {
    await fs.access(dataPath);
    return dataPath;
  } catch {
    try {
      await fs.access(publicPath);
      return publicPath;
    } catch {
      return null;
    }
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const fileName = safeName(filename);
  if (!fileName) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const filePath = await findFile(fileName);
  if (!filePath) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const bytes = await fs.readFile(filePath);
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
