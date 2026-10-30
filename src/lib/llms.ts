// Shared pieces of /llms.txt and /llms-full.txt (https://llmstxt.org).
import { getCollection } from 'astro:content';

export const SUMMARY = 'STRUKT is a magazine for everyone who makes the night, from the person rigging the lights to the artist whose work hangs behind the booth. It takes festivals and club nights apart so every one of them gets named. Published by Obslik Studios, from Vancouver.';
export const ROLES = 'Lighting designers, riggers, sound engineers, stage managers, VJs, visual artists, painters, set builders, photographers, fashion designers, stylists, dancers, pop-up makers, flyer designers, promoters, door staff, the one who drove the van, and DJs.';

export async function content() {
  const posts = (await getCollection('journal', ({ data }) => (import.meta.env.PROD ? !data.draft : true))).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  const tracks = (await getCollection('tracks')).sort((a, b) => b.data.week.valueOf() - a.data.week.valueOf());
  return { posts, tracks };
}

export const pages = (base: string) => [
  ['About STRUKT', `${base}/about/`, 'Who the magazine is for and why it credits everyone who builds a night.'],
  ['Call for creatives', `${base}/call-for-creatives/`, 'How to get featured: free, open to anyone who makes something for a night.'],
  ['Track of the week', `${base}/tracks/`, 'One track a week with every credit: producer, vocalist, mastering engineer and samples.'],
] as const;
