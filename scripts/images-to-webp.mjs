#!/usr/bin/env node
/**
 * 把 public/images/posts 下的封面 PNG 批量转为 WebP，并更新文章的 image 引用。
 *
 * 用法：node scripts/images-to-webp.mjs [项目根目录]
 * 不传参数时默认取脚本所在项目的根目录。
 *
 * 依赖 sharp（Astro 的依赖，npm install 后位于 node_modules，无需单独安装）。
 * 转换后原 PNG 会被删除，转换前请确保已提交或备份。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.argv[2] || path.dirname(SCRIPT_DIR));
const POSTS_DIR = path.join(ROOT, 'public', 'images', 'posts');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const MAX_WIDTH = 960;
const QUALITY = 80;

function walk(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, ext, out);
    else if (path.extname(entry.name).toLowerCase() === ext) out.push(full);
  }
  return out;
}

const pngs = walk(POSTS_DIR, '.png');
console.log(`找到 ${pngs.length} 张 PNG，目标：宽 ${MAX_WIDTH}px WebP q${QUALITY}`);

let before = 0;
let after = 0;

for (const png of pngs) {
  const webp = png.replace(/\.png$/i, '.webp');
  const buf = fs.readFileSync(png);
  before += buf.length;
  const out = await sharp(buf)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();
  fs.writeFileSync(webp, out);
  after += out.length;
  fs.unlinkSync(png);
}

console.log(`体积：${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB（省 ${(100 - after / before * 100).toFixed(0)}%）`);

const mds = walk(CONTENT_DIR, '.md');
let changed = 0;
for (const md of mds) {
  const raw = fs.readFileSync(md, 'utf8');
  const next = raw.replace(/^(\s*image:\s*"\/images\/posts\/[^"]+)\.png("\s*)$/gim, '$1.webp$2');
  if (next !== raw) {
    fs.writeFileSync(md, next, 'utf8');
    changed++;
  }
}
console.log(`已更新 ${changed} 篇文章的 image 引用为 .webp`);
console.log(`剩余 PNG：${walk(POSTS_DIR, '.png').length} 张`);
