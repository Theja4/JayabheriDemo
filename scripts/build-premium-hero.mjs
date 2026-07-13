import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const input = process.argv[2] ? resolve(process.argv[2]) : null;

if (!input) {
  throw new Error("Pass the restored hero image path as the first argument.");
}

const stillsDir = join(ROOT, "assets/images/stills");
const optDir = join(ROOT, "assets/images/opt/stills");
await mkdir(stillsDir, { recursive: true });
await mkdir(optDir, { recursive: true });

const sharpen = { sigma: 0.75, m1: 0.7, m2: 1.25, x1: 2, y2: 10, y3: 20 };
const wideWidths = [480, 960, 1600, 2560];

for (const width of wideWidths) {
  const output = join(optDir, `hero-pinnacle-premium-${width}.webp`);
  await sharp(input)
    .modulate({ brightness: 1.07 })
    .resize({ width, kernel: sharp.kernel.lanczos3 })
    .sharpen(sharpen)
    .webp({ quality: width >= 1600 ? 84 : 80, effort: 6, smartSubsample: true })
    .toFile(output);
}

await sharp(input)
  .modulate({ brightness: 1.07 })
  .resize({ width: 2560, kernel: sharp.kernel.lanczos3 })
  .sharpen(sharpen)
  .webp({ quality: 90, effort: 6, smartSubsample: true })
  .toFile(join(stillsDir, "hero-pinnacle-premium.webp"));

const meta = await sharp(input).metadata();
const mobileCropWidth = Math.min(900, meta.width);
// The towers sit right of the source image's geometric centre. Use their visual
// centre as the mobile focal point so both towers get equal breathing room.
const mobileFocalX = Math.round(meta.width * 0.563);
const mobileLeft = Math.max(
  0,
  Math.min(meta.width - mobileCropWidth, mobileFocalX - Math.round(mobileCropWidth / 2)),
);
const mobileSource = sharp(input).extract({
  left: mobileLeft,
  top: 0,
  width: mobileCropWidth,
  height: meta.height,
});
const mobileBuffer = await mobileSource.toBuffer();

for (const width of [480, 900, 1440]) {
  const output = join(optDir, `hero-pinnacle-premium-mobile-${width}.webp`);
  await sharp(mobileBuffer)
    .modulate({ brightness: 1.09 })
    .resize({ width, kernel: sharp.kernel.lanczos3 })
    .sharpen(sharpen)
    .webp({ quality: width >= 900 ? 84 : 80, effort: 6, smartSubsample: true })
    .toFile(output);
}

await sharp(mobileBuffer)
  .modulate({ brightness: 1.09 })
  .resize({ width: 1440, kernel: sharp.kernel.lanczos3 })
  .sharpen(sharpen)
  .webp({ quality: 90, effort: 6, smartSubsample: true })
  .toFile(join(stillsDir, "hero-pinnacle-premium-mobile.webp"));

console.log("Premium hero masters and responsive variants created.");
