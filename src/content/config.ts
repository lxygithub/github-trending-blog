import { defineCollection, z } from 'astro:content';

export const collections = {
  posts: defineCollection({
    type: 'content',
    schema: z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: z.string().optional(),
      tags: z.array(z.string()).default([]),
      repo: z.string().optional(),
      githubUrl: z.string().optional(),
      stars: z.number().optional(),
      language: z.string().optional(),
      trendingDate: z.string().optional(),
    }),
  }),
};
