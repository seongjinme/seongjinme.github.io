// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkCjkFriendly from 'remark-cjk-friendly';
import imageFigures from './src/plugins/image-figures.ts';

export default defineConfig({
  site: 'https://seongjin.me',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkCjkFriendly],
      rehypePlugins: [imageFigures],
    }),
  },
});
