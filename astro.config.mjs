import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Change this to your real domain before launch. Canonical links, the sitemap
  // and social previews are all built from it.
  site: 'https://strukt.example',
  integrations: [sitemap()],
});
