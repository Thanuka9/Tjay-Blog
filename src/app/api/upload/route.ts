import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/session";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export async function POST(request: Request) {
  const store = await cookies();
  const valid = await isValidSessionToken(
    store.get(SESSION_COOKIE)?.value,
    process.env.AUTH_SECRET ?? "",
  );
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Use a jpg, png, webp, gif, or svg." },
      { status: 400 },
    );
  }
  if (file.size > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "File is over 6MB." }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeExt = extension.replace(/[^a-z0-9]/g, "") || "bin";
  const fileName = `${nanoid(12)}.${safeExt}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadDir, fileName), bytes);

  return NextResponse.json({ url: `/uploads/${fileName}` });
}
