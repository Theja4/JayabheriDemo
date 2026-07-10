/* Responsive image ladder + LQIP generator.
   Scans index.html for content images, emits webp variants at
   fixed widths into assets/images/opt/ plus a manifest consumed
   by scripts/apply-srcset.mjs.                                   */
import sharp from "sharp";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const WIDTHS = [480, 960, 1600, 2400];
const QUALITY = 72;
const LQIP_WIDTH = 24;

// content sections only — logos, icons and plan/interactive line drawings stay untouched
const INCLUDE = /^assets\/images\/(gallery|clubhouse|stills|tower|interactive|progress)\//;
const EXCLUDE = /\/icons\//;

const html = await readFile(join(ROOT, "index.html"), "utf8");
const refs = [...new Set(
  [...html.matchAll(/src="(assets\/images\/[^"]+)"/g)].map((m) => m[1])
)].filter((p) => INCLUDE.test(p) && !EXCLUDE.test(p));

const manifest = {};
for (const rel of refs) {
  const img = sharp(join(ROOT, rel));
  const meta = await img.metadata();
  const outBase = rel
    .replace("assets/images/", "assets/images/opt/")
    .replace(/\.(webp|jpg|jpeg|png)$/i, "");
  await mkdir(join(ROOT, dirname(outBase)), { recursive: true });

  const widths = WIDTHS.filter((w) => w < meta.width);
  widths.push(Math.min(meta.width, WIDTHS.at(-1)));
  const variants = [];
  for (const w of [...new Set(widths)].sort((a, b) => a - b)) {
    const out = `${outBase}-${w}.webp`;
    await sharp(join(ROOT, rel)).resize({ width: w }).webp({ quality: QUALITY }).toFile(join(ROOT, out));
    variants.push({ w, path: out });
  }

  const lqipBuf = await sharp(join(ROOT, rel))
    .resize({ width: LQIP_WIDTH })
    .webp({ quality: 35 })
    .toBuffer();

  manifest[rel] = {
    width: meta.width,
    height: meta.height,
    variants,
    lqip: `data:image/webp;base64,${lqipBuf.toString("base64")}`,
  };
  console.log(`${rel} (${meta.width}x${meta.height}) -> ${variants.map((v) => v.w).join("/")}`);
}

await writeFile(join(ROOT, "assets/images/opt/manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\n${Object.keys(manifest).length} images processed.`);
