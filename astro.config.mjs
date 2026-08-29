import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://your-domain.example.com',
  output: 'static',
  markdown: {
    shikiConfig: { theme: 'github-dark' }
  }
});
