#!/usr/bin/env node
/**
 * 校验 src/content 下所有 Markdown 文章的 frontmatter。
 *
 * 目的：把「YAML 解析失败 / 字段类型错误」这类问题挡在构建之前，
 * 避免带病内容进入仓库后直到部署才暴露。
 *
 * 不引入新依赖：js-yaml 已被 Astro 提升为顶层依赖（见 package-lock.json），
 * 直接用 npm ci 安装后即可 import。运行：node scripts/validate-content.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const COVER_DIR = path.join(ROOT, 'public', 'images', 'posts');
const MD_EXT = new Set(['.md', '.mdx']);

const issues = [];
let checked = 0;

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (MD_EXT.has(path.extname(entry.name).toLowerCase())) checkFile(full);
  }
}

function report(file, message) {
  issues.push(`${path.relative(ROOT, file)}: ${message}`);
}

function extractFrontmatter(raw, file) {
  // 只允许文件以 --- 开头；frontmatter 必须用成对的 --- 包裹。
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    report(file, '缺少有效的 frontmatter（需以 --- 开头并用 --- 闭合）');
    return null;
  }
  return match[1];
}

function checkFile(file) {
  checked++;
  const raw = fs.readFileSync(file, 'utf8');
  const fm = extractFrontmatter(raw, file);
  if (fm === null) return;

  let data;
  try {
    data = load(fm);
  } catch (err) {
    const loc = err.mark ? ` (第 ${err.mark.line + 2} 行附近)` : '';
    report(file, `YAML 解析失败${loc}: ${err.reason || err.message}`);
    return;
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    report(file, 'frontmatter 必须是一个键值映射对象');
    return;
  }

  // 必填字段（对齐 src/content/config.ts 的 schema）
  for (const key of ['title', 'description']) {
    if (typeof data[key] !== 'string' || !data[key].trim()) {
      report(file, `字段 "${key}" 缺失或不是非空字符串`);
    }
  }

  if (data.pubDate === undefined) {
    report(file, '字段 "pubDate" 缺失');
  } else if (Number.isNaN(new Date(data.pubDate).getTime())) {
    report(file, `字段 "pubDate" 不是有效日期: ${JSON.stringify(data.pubDate)}`);
  }

  // tags：数组、元素是字符串，并且拦截 AI 生成时常见的 hashtag 误写
  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      report(file, `字段 "tags" 必须是数组，当前为 ${typeof data.tags}`);
    } else {
      data.tags.forEach((tag, i) => {
        if (typeof tag !== 'string' || !tag.trim()) {
          report(file, `tags[${i}] 不是非空字符串: ${JSON.stringify(tag)}`);
        } else if (tag.trim().startsWith('#')) {
          report(file, `tags[${i}] 以 "#" 开头（YAML 中 # 会被当作注释，属常见误写）: ${JSON.stringify(tag)}`);
        }
      });
    }
  }

  if (data.locale !== undefined && !['en', 'zh'].includes(data.locale)) {
    report(file, `字段 "locale" 只能是 en 或 zh，当前为 ${JSON.stringify(data.locale)}`);
  }

  // 封面图必须是 WebP：拦截自动生成流程回退到 PNG 的情况
  if (typeof data.image === 'string' && /\.png$/i.test(data.image)) {
    report(file, `封面图 image 引用了 .png（应使用 .webp）: ${data.image}`);
  }

  // 数组型可选字段的类型检查（这些字段若写成标量通常是生成错误）
  for (const key of ['authors', 'categories']) {
    if (data[key] !== undefined && !Array.isArray(data[key])) {
      report(file, `字段 "${key}" 若存在必须是数组`);
    }
  }
}

walk(CONTENT_DIR);

// 检查封面图目录里是否混入了 PNG（生成流程应直接产出 WebP）
if (fs.existsSync(COVER_DIR)) {
  const pngs = fs.readdirSync(COVER_DIR).filter((f) => /\.png$/i.test(f));
  if (pngs.length > 0) {
    report(path.join(COVER_DIR, pngs[0]), `封面图目录存在 ${pngs.length} 个 .png 文件，应转为 WebP（运行 node scripts/images-to-webp.mjs）`);
  }
}

if (issues.length > 0) {
  console.error(`\n[validate-content] 校验失败：检查了 ${checked} 篇文章，发现 ${issues.length} 处问题：\n`);
  for (const issue of issues) console.error(`  - ${issue}`);
  console.error('\n请修正以上问题后再构建。常见错误：tags 写成 [#a #b] 而非 [a, b]；封面图使用了 PNG。\n');
  process.exit(1);
}

console.log(`[validate-content] 校验通过：${checked} 篇文章的 frontmatter 均合法。`);
