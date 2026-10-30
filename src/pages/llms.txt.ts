// /llms.txt: a short, plain-text map of the site for AI assistants (https://llmstxt.org).
import type { APIRoute } from 'astro';
import { content, pages, SUMMARY, ROLES } from '../lib/llms';

export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL('https://www.struktmagazine.com')).href.replace(/\/$/, '');
  const { posts, tracks } = await content();
  const lines = [
    '# STRUKT',
    '',
    `> ${SUMMARY}`,
    '',
    `Who it's for: ${ROLES}`,
    '',
    'Every journal post is also available as plain Markdown at the same address with .md on the end, as linked below.',
    '',
    '## Journal',
    '',
    ...posts.map((p) => `- [${p.data.title}](${base}/journal/${p.id}.md): ${p.data.description}`),
    '',
    '## Pages',
    '',
    ...pages(base).map(([t, u, d]) => `- [${t}](${u}): ${d}`),
    '',
    '## Track of the week',
    '',
    ...tracks.map((t) => `- ${t.data.week.toISOString().slice(0, 10)}: [${t.data.title} by ${t.data.artist}](${t.data.link}). ${t.data.note}`),
    '',
    '## Optional',
    '',
    `- [Everything in one file](${base}/llms-full.txt): every journal post in full, and every track of the week with its credits.`,
    `- [Sitemap](${base}/sitemap-index.xml)`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
