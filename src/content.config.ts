import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Every journal post is a Markdown file in src/content/journal.
// The limits on title and description keep search snippets from being cut off.
const journal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: z.object({
    title: z.string().max(70),
    description: z.string().max(170),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['Craft', 'Careers', 'The scene', 'STRUKT']),
    tags: z.array(z.string()).default([]),
    // a full URL, or a path to a self-hosted image in public/, e.g. /images/journal/<slug>/hero.webp
    heroImage: z.string().refine((v) => v.startsWith('/') || /^https?:\/\//.test(v), 'heroImage must be a full URL or a path starting with /').optional(),
    heroAlt: z.string().optional(),
    heroCredit: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// Track of the week: one Markdown file per week in src/content/tracks. The newest week is the featured track.
// Platform tracks play through their embed (embedUrl). Self-hosted tracks (platform: file) need an audioFile
// under /audio/ and rightsConfirmed: true, so nothing goes on the site without permission to host it.
const tracks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tracks' }),
  schema: z
    .object({
      week: z.coerce.date(),
      title: z.string(),
      artist: z.string(),
      release: z.string().optional(),
      label: z.string().optional(),
      platform: z.enum(['soundcloud', 'bandcamp', 'spotify', 'youtube', 'file']),
      embedUrl: z.string().url().optional(),
      link: z.string().url(),
      audioFile: z.string().startsWith('/audio/', 'audioFile must be a path under public/audio/, e.g. /audio/2026-11-09-track.mp3').optional(),
      rightsConfirmed: z.boolean().default(false),
      artwork: z.string().optional(),
      credits: z.array(z.object({ role: z.string(), name: z.string() })).default([]),
      note: z.string(),
    })
    .superRefine((t, ctx) => {
      if (t.platform === 'file') {
        if (!t.audioFile) ctx.addIssue({ code: 'custom', path: ['audioFile'], message: 'audioFile is required when platform is "file"' });
        if (!t.rightsConfirmed) ctx.addIssue({ code: 'custom', path: ['rightsConfirmed'], message: 'rightsConfirmed must be true before a track is self-hosted (platform "file")' });
      } else if (!t.embedUrl) {
        ctx.addIssue({ code: 'custom', path: ['embedUrl'], message: `embedUrl is required when platform is "${t.platform}"` });
      }
    }),
});

export const collections = { journal, tracks };
