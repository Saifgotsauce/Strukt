// IndexNow: tell Bing (and the other IndexNow engines) about new or changed pages as soon as a production build finishes.
//
// It compares the sitemap this build just wrote with the sitemap currently live on the site, and submits only URLs that
// are new or whose <lastmod> changed. It runs only on Vercel production builds (VERCEL_ENV=production) and never fails
// the build: any problem is logged and skipped. The key is public by design; it's served at /<key>.txt.
//
// INDEXNOW_DRY_RUN=1 prints what would be sent without sending it (works on any build).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ENDPOINT = 'https://api.indexnow.org/indexnow';

const parse = (xml) => {
  const out = new Map();
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = m[1].match(/<loc>(.*?)<\/loc>/)?.[1];
    if (loc) out.set(loc, m[1].match(/<lastmod>(.*?)<\/lastmod>/)?.[1] ?? '');
  }
  return out;
};

export default function indexnow({ site, key }) {
  return {
    name: 'strukt-indexnow',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const dry = !!process.env.INDEXNOW_DRY_RUN;
        if (process.env.VERCEL_ENV !== 'production' && !dry) return;
        try {
          const root = fileURLToPath(dir);
          const built = fs.readdirSync(root).filter((f) => /^sitemap-\d+\.xml$/.test(f)).map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('');
          const next = parse(built);
          if (!next.size) return logger.warn('IndexNow: no sitemap found in the build, nothing submitted');

          // what is live right now (this build isn't promoted yet)
          let live = new Map();
          try {
            const index = await (await fetch(`${site}/sitemap-index.xml`, { signal: AbortSignal.timeout(10000) })).text();
            for (const m of index.matchAll(/<loc>(.*?)<\/loc>/g)) {
              if (!m[1].startsWith(site)) continue;
              for (const [u, d] of parse(await (await fetch(m[1], { signal: AbortSignal.timeout(10000) })).text())) live.set(u, d);
            }
          } catch (e) {
            logger.warn(`IndexNow: couldn't read the live sitemap (${e.message}); submitting every URL`);
          }
          const urlList = [...next].filter(([u, d]) => !live.has(u) || (d && live.get(u) !== d)).map(([u]) => u);
          if (!urlList.length) return logger.info('IndexNow: no new or changed URLs');

          const body = { host: new URL(site).host, key, keyLocation: `${site}/${key}.txt`, urlList };
          if (dry) return logger.info(`IndexNow (dry run): would submit ${urlList.length} URL(s): ${urlList.join(', ')}`);
          const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
          logger.info(`IndexNow: submitted ${urlList.length} URL(s), response ${res.status}${res.status >= 400 ? ` ${await res.text()}` : ''}`);
        } catch (e) {
          logger.warn(`IndexNow: skipped (${e.message})`);
        }
      },
    },
  };
}
