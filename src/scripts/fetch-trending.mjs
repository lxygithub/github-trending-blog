import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, '../content/posts');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function parseNum(text = '') {
  const t = text.replace(/,/g, '').trim().toLowerCase();
  if (!t) return 0;
  if (t.endsWith('k')) return Math.round(parseFloat(t.slice(0, -1)) * 1000);
  if (t.endsWith('m')) return Math.round(parseFloat(t.slice(0, -1)) * 1000000);
  return parseInt(t, 10) || 0;
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function fetchTrending(topN = 10) {
  const url = 'https://github.com/trending?since=daily';
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`GitHub Trending 请求失败: HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const repos = [];

  $('article.Box-row').each((_, el) => {
    const $el = $(el);
    const name = $el.find('h2 a').attr('href')?.replace(/^\//, '').replace(/\.git$/, '')?.trim() || '';
    if (!name) return;
    const description = $el.find('p').first().text().trim();
    const language = $el.find('span[itemprop="programmingLanguage"]').first().text().trim();
    const starsText = $el.find('a[href$="/stargazers"]').first().text().trim();
    const todayText = $el.find('span.d-inline-block.float-sm-right').first().text().replace(/\s+/g, ' ').trim();
    const todayStars = todayText ? parseNum(todayText.split(' ')[0]) : 0;
    repos.push({
      name,
      url: `https://github.com/${name}`,
      description,
      language,
      stars: parseNum(starsText),
      todayStars,
    });
    if (repos.length >= topN) return false;
  });

  return repos;
}

function buildMarkdown(repos, dateStr) {
  const lines = [];
  lines.push('---');
  lines.push(`title: "GitHub Trending 日报 ${dateStr}"`);
  lines.push(`description: "${dateStr} GitHub 热门开源项目速览与评测草稿。"`);
  lines.push(`pubDate: ${dateStr}`);
  lines.push('tags: ["GitHub Trending", "日报", "评测草稿"]');
  lines.push('---');
  lines.push('');
  lines.push(`# GitHub Trending 日报 ${dateStr}`);
  lines.push('');
  lines.push('> 本文由脚本自动生成，包含当日 GitHub Trending 热门项目信息和评测模板，请补充实测体验后发布。');
  lines.push('');

  repos.forEach((repo, i) => {
    lines.push(`## ${i + 1}. ${repo.name}`);
    lines.push('');
    lines.push(`- **仓库**：${repo.url}`);
    lines.push(`- **语言**：${repo.language || '未知'}`);
    lines.push(`- **总 Star**：${repo.stars.toLocaleString()}`);
    lines.push(`- **今日 Star**：${repo.todayStars.toLocaleString()}`);
    lines.push(`- **简介**：${repo.description || '暂无简介'}`);
    lines.push('');
    lines.push('### 快速上手指南');
    lines.push('');
    lines.push('```bash');
    lines.push('# 待补充');
    lines.push('```');
    lines.push('');
    lines.push('### 实测体验');
    lines.push('');
    lines.push('（待补充：安装、运行、截图、真实使用感受）');
    lines.push('');
    lines.push('### 优点');
    lines.push('');
    lines.push('（待补充）');
    lines.push('');
    lines.push('### 缺点 / 坑');
    lines.push('');
    lines.push('（待补充）');
    lines.push('');
    lines.push('### 适合谁');
    lines.push('');
    lines.push('（待补充）');
    lines.push('');
  });

  return lines.join('\n');
}

const topN = Number(process.argv.find((a) => a.startsWith('--top='))?.split('=')[1] || 10);
const force = process.argv.includes('--force');
const dateStr = todayStr();
const filename = `trending-${dateStr}.md`;
const filepath = path.join(POSTS_DIR, filename);

const exists = await fs.access(filepath).then(() => true).catch(() => false);
if (exists && !force) {
  console.log(`已存在 ${filename}，跳过生成。使用 --force 覆盖。`);
  process.exit(0);
}

const repos = await fetchTrending(topN);
console.log(`抓取到 ${repos.length} 个 Trending 项目，生成 ${filename}`);
const md = buildMarkdown(repos, dateStr);
await fs.writeFile(filepath, md, 'utf8');
console.log(`已生成: ${filepath}`);
