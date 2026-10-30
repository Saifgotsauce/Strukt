// /llms-full.txt: every journal post in full, plus every track of the week with its credits, in one Markdown file.
import type { APIRoute } from 'astro';
import { content, pages, SUMMARY, ROLES } from '../lib/llms';
import { postToMarkdown } from '../lib/markdown';

export const GET: APIRoute = async ({ site }) => {
  const s = site ?? new URL('https://www.struktmagazine.com');
  const base = s.href.replace(/\/$/, '');
  const { posts, tracks } = await content();
  const parts = [
    `# STRUKT\n\n> ${SUMMARY}\n\nWho it's for: ${ROLES}\n\nPages:\n${pages(base).map(([t, u, d]) => `- [${t}](${u}): ${d}`).join('\n')}`,
    ...posts.map((p) => postToMarkdown(p, s).replace(/^# /, '# Journal: ')),
    `# Track of the week\n\n${tracks.map((t) => {
      const d = t.data;
      return [`## ${d.title}, ${d.artist} (week of ${d.week.toISOString().slice(0, 10)})`, '', d.note, '', ...(d.release ? [`Release: ${d.release}`] : []), ...(d.label ? [`Label: ${d.label}`] : []), `Listen: ${d.link}`, '', 'Credits:', ...d.credits.map((c) => `- ${c.role}: ${c.name}`)].join('\n');
    }).join('\n\n')}`,
  ];
  return new Response(parts.join('\n\n---\n\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
