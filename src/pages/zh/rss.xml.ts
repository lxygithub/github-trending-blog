import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context: { site: string }) {
  const posts = (await getCollection('posts'))
    .filter((post) => post.data.locale === 'zh')
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  return rss({
    title: 'DevPulse 中文版',
    description: '面向开发者的每日科技新闻',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/zh/posts/${post.slug.replace(/^zh\//, '')}/`,
    })),
  });
}
