export const IMAGE_EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
};

const ALLOWED_MIME = new Set(Object.values(IMAGE_EXT_MIME));

export function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
}

export function mimeForUpload(file: File) {
  if (file.type && ALLOWED_MIME.has(file.type)) return file.type;
  return IMAGE_EXT_MIME[extensionOf(file.name)] ?? null;
}

export function isImageFile(file: File) {
  return Boolean(mimeForUpload(file) || file.type.startsWith("image/"));
}
