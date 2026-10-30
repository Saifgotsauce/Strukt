// robots.txt, built from `site` so the sitemap line always points at the live domain.
// Search and AI crawlers are named explicitly so it's clear they're welcome; everyone else is allowed too.
import type { APIRoute } from 'astro';

const crawlers = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User',
  'Bingbot', 'Googlebot', 'Google-Extended', 'Applebot', 'Applebot-Extended', 'DuckDuckBot',
];

export const GET: APIRoute = ({ site }) => {
  const base = (site ?? new URL('https://www.struktmagazine.com')).href.replace(/\/$/, '');
  const body = [
    ...crawlers.map((c) => `User-agent: ${c}`),
    'Allow: /',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${base}/sitemap-index.xml`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
