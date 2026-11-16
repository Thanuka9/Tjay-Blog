// Bake the historical plate's Fig. 1–2 into a real image asset.
// Keeping the crop in the image avoids object-position differences between
// HTML previews, the published site, and PDF/image renderers.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const source = join(process.cwd(), "public/covers/creatine-crystals-1853.jpg");
const destination = join(process.cwd(), "public/covers/creatine-figures-1-2.jpg");
const original = await readFile(source);
const metadata = await sharp(original).metadata();
if (metadata.width !== 1600 || metadata.height !== 2214) {
  throw new Error(
    `Unexpected creatine plate dimensions: ${metadata.width}x${metadata.height}; crop needs review`
  );
}
const crop = await sharp(original)
  .extract({ left: 0, top: 0, width: 1600, height: 614 })
  .jpeg({ quality: 90, mozjpeg: true })
  .toBuffer();
const check = await sharp(crop).metadata();
if (check.width !== 1600 || check.height !== 614) {
  throw new Error("Generated creatine cover crop has incorrect dimensions");
}
await writeFile(destination, crop);
console.log("Prepared Fig. 1–2 creatine cover crop (1600x614).");
