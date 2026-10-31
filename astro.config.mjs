import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import fs from 'node:fs';
import indexnow from './integrations/indexnow.mjs';
import securityHeaders from './integrations/security-headers.mjs';
import { satteri } from '@astrojs/markdown-satteri';
import gapNotes from './src/lib/gap-notes.mjs';

// The live domain. Canonical links, the sitemap, robots.txt, llms.txt and social previews are all built from it.
const site = 'https://www.struktmagazine.com';

// Last-modified date for each journal post (updatedDate, else pubDate), so the sitemap tells crawlers when a post changes.
const postDates = new Map();
for (const f of fs.readdirSync('./src/content/journal').filter((f) => f.endsWith('.md'))) {
  const fm = fs.readFileSync(`./src/content/journal/${f}`, 'utf8').split('---')[1] ?? '';
  const date = (fm.match(/^updatedDate:\s*["']?([\d-]+)/m) ?? fm.match(/^pubDate:\s*["']?([\d-]+)/m))?.[1];
  if (date) postDates.set(`${site}/journal/${f.replace(/\.md$/, '')}/`, new Date(date).toISOString());
}

export default defineConfig({
  site,
  integrations: [
    sitemap({
      serialize(item) {
        if (postDates.has(item.url)) item.lastmod = postDates.get(item.url);
        return item;
      },
    }),
    // after sitemap: reads the sitemap it just wrote and reports new or changed URLs to IndexNow (Bing) on production builds
    indexnow({ site, key: 'ed491aa9a8ccb24676f587de09d3646b' }),
    // last, after the Vercel adapter has written its routes: a Content Security Policy and hardening headers on every response
    securityHeaders(),
  ],
  markdown: {
    // marks the italic "We couldn't find..." notes in posts so they can be styled
    processor: satteri({ hastPlugins: [gapNotes] }),
  },
  adapter: vercel({
    webAnalytics: { enabled: true }
  }),
});
