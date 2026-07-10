/* Rewrites index.html <img> tags using assets/images/opt/manifest.json:
   adds srcset/sizes, decoding="async", blur-up LQIP background,
   data-thumb (smallest variant) and data-full (largest variant).      */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(await readFile(join(ROOT, "assets/images/opt/manifest.json"), "utf8"));
let html = await readFile(join(ROOT, "index.html"), "utf8");

// per-slot rendered widths; default is full-bleed
const sizesFor = (tag, src) => {
  if (tag.includes("club__building")) return "(min-width: 861px) 55vw, 100vw";
  if (src.startsWith("assets/images/progress/")) return "(min-width: 781px) 40vw, 90vw";
  if (src === "assets/images/gallery/14.webp" && !tag.includes("loading=")) {
    return "(min-width: 1081px) 40vw, 92vw"; // intro tower figure
  }
  return "100vw";
};

// below-the-fold images that were still loading eagerly
const FORCE_LAZY = ["res-selector__image", "views__img", "greenery__frame"];

let touched = 0;
html = html.replace(/<img\b[^>]*>/g, (tag) => {
  const srcMatch = tag.match(/src="([^"]+)"/);
  if (!srcMatch || !manifest[srcMatch[1]]) return tag;
  const src = srcMatch[1];
  const { variants, lqip } = manifest[src];

  const srcset = variants.map((v) => `${v.path} ${v.w}w`).join(", ");
  const thumb = variants[0].path;
  const full = variants.at(-1).path;

  let out = tag;
  const selfClosing = out.endsWith("/>");
  const insert = (attrs) => {
    out = selfClosing ? out.replace(/\s*\/>$/, ` ${attrs}/>`) : out.replace(/>$/, ` ${attrs}>`);
  };

  insert(`srcset="${srcset}" sizes="${sizesFor(tag, src)}" data-thumb="${thumb}" data-full="${full}"`);
  if (!out.includes("decoding=")) insert(`decoding="async"`);
  if (!out.includes("loading=") && FORCE_LAZY.some((c) => tag.includes(c))) insert(`loading="lazy"`);
  insert(`data-lqip style="background:url(${lqip}) center/cover no-repeat"`);
  touched += 1;
  return out;
});

await writeFile(join(ROOT, "index.html"), html);
console.log(`${touched} <img> tags rewritten.`);
