// /journal/<slug>.md: the plain-Markdown version of each published post.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { postToMarkdown } from '../../lib/markdown';

export async function getStaticPaths() {
  const posts = await getCollection('journal', ({ data }) => (import.meta.env.PROD ? !data.draft : true));
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

export const GET: APIRoute = ({ props, site }) =>
  new Response(postToMarkdown(props.post, site ?? new URL('https://www.struktmagazine.com')), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
