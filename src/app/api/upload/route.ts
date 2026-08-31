import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/session";
import { IMAGE_EXT_MIME, extensionOf, mimeForUpload } from "@/lib/image-files";

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
  const type = mimeForUpload(file);
  if (!type) {
    return NextResponse.json(
      { error: "Use a jpg, png, webp, gif, avif, or svg." },
      { status: 400 },
    );
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "File is over 8MB." }, { status: 400 });
  }

  const extension = extensionOf(file.name);
  const safeExt = IMAGE_EXT_MIME[extension] ? extension : "jpg";
  const fileName = `${nanoid(12)}.${safeExt}`;
  const uploadDir = path.join(process.cwd(), "data", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadDir, fileName), bytes);

  return NextResponse.json({ url: `/uploads/${fileName}` });
}
