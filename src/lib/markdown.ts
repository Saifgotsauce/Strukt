// Plain-Markdown versions of journal posts, for /journal/<slug>.md and /llms-full.txt.
// Readers such as AI assistants get the words without the page chrome: figures become Markdown images with
// absolute URLs and their captions, embeds become links, and editorial HTML comments are left out.
import type { CollectionEntry } from 'astro:content';

const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '';

export function bodyToMarkdown(body: string, site: URL): string {
  const abs = (u: string) => new URL(u, site).href;
  return body
    .replace(/<!--[\s\S]*?-->\s*/g, '')
    .replace(/<figure[^>]*>([\s\S]*?)<\/figure>/g, (_, inner: string) => {
      const caption = strip(inner.match(/<figcaption>([\s\S]*?)<\/figcaption>/)?.[1] ?? '');
      const img = inner.match(/<img[^>]*>/)?.[0];
      const video = inner.match(/<video[^>]*>/)?.[0];
      const iframe = inner.match(/<iframe[^>]*>/)?.[0];
      if (img) return `![${attr(img, 'alt')}](${abs(attr(img, 'src'))})\n\n*${caption}*`;
      if (video) return `[Video: ${caption}](${abs(attr(video, 'src'))})`;
      if (iframe) {
        const src = attr(iframe, 'src'), id = src.match(/\/embed\/([\w-]+)/)?.[1];
        return `[Video: ${attr(iframe, 'title')}](${id ? `https://www.youtube.com/watch?v=${id}` : src})\n\n*${caption}*`;
      }
      return caption;
    })
    .replace(/\]\((\/[^)\s]*)\)/g, (_, p: string) => `](${abs(p)})`)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function postToMarkdown(post: CollectionEntry<'journal'>, site: URL): string {
  const d = post.data;
  const url = new URL(`/journal/${post.id}/`, site).href;
  const date = (x: Date) => x.toISOString().slice(0, 10);
  const head = [
    `# ${d.title}`,
    '',
    `> ${d.description}`,
    '',
    `- Published: ${date(d.pubDate)}${d.updatedDate ? `, updated ${date(d.updatedDate)}` : ''}`,
    `- Category: ${d.category}`,
    `- By: STRUKT`,
    `- Web page: ${url}`,
    '',
  ];
  if (d.heroImage) head.push(`![${d.heroAlt ?? ''}](${new URL(d.heroImage, site).href})`, '', d.heroCredit ? `*${d.heroCredit}*` : '', '');
  return head.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n\n' + bodyToMarkdown(post.body ?? '', site) + '\n';
}
