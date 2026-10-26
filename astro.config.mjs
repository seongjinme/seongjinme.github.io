// @ts-check
import { defineConfig } from 'astro/config';
import imageFigures from './src/plugins/image-figures.ts';

export default defineConfig({
  integrations: [imageFigures()],
});
