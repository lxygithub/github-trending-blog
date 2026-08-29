# GitHub Trending 评测博客

基于 Astro 的 GitHub 热门开源项目评测博客，可免费部署到 Cloudflare Pages。

## 本地开发

```bash
npm install
npm run dev
```

## 抓取 GitHub Trending 生成文章草稿

```bash
npm run new:trending
```

脚本会抓取今日 GitHub Trending，并生成 Markdown 草稿到 `src/content/posts/`。

## 构建

```bash
npm run build
```

输出目录：`dist/`

## 部署到 Cloudflare Pages

1. 把项目推送到 GitHub
2. Cloudflare Pages 连接仓库
3. 构建命令：`npm run build`
4. 输出目录：`dist`
