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
    heroImage: z.string().url().optional(),
    heroAlt: z.string().optional(),
    heroCredit: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { journal };
