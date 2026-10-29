import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  // Change this to your real domain before launch. Canonical links, the sitemap
  // and social previews are all built from it.
  site: 'https://strukt.example',
  integrations: [sitemap()],
  adapter: vercel({
    webAnalytics: { enabled: true }
  }),
});
