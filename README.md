# STRUKT

The STRUKT magazine site, built with Astro.

## Run it on your computer

You need Node.js (version 22.23.4 or newer).

```bash
npm install
npm run dev
```

Open http://localhost:4321. Pages:

- `/` the journal (all posts)
- `/about` the opening piece
- `/call-for-creatives` the submission form
- `/journal/<post-name>/` each post

## Write a post

1. Add a Markdown file to `src/content/journal/`, for example `rigging-safety-basics.md`.
   The file name becomes the web address.
2. Start it with this block:

```md
---
title: "Under 70 characters, written like the question people search"
description: "Under 170 characters. This is the snippet Google shows."
pubDate: 2026-11-10
category: "Craft"          # Craft, Careers, The scene or STRUKT
tags: ["lighting", "Vancouver"]
heroImage: "https://..."   # optional
heroAlt: "What the photo shows"
heroCredit: "Photo: Name, Unsplash"
draft: false
---
```

3. Write the post below it. Use `##` for section headings and `>` for quotes.

Posts marked `draft: true` show up locally but are hidden on the live site.
Both sample posts are drafts until a real quote replaces the placeholder.

## Before launch

1. The live domain is set once, as `site` in `astro.config.mjs`. Canonical links, the sitemap, `robots.txt`, `llms.txt` and social previews are all built from it.
2. Submissions from the call for creatives form go to Formspree (`https://formspree.io/f/maeebnbb`, set as the form's `action` in `src/pages/call-for-creatives.astro`). Check that a test submission reaches your Formspree inbox.
3. Download the Unsplash photos and put them in `public/` if you'd rather host them yourself.

## Deploy on Vercel

1. Put this folder in a GitHub repository.
2. In Vercel, choose Add New Project and import the repository. Vercel detects Astro automatically.
3. Every time you push a new post, the site rebuilds and publishes it.

## Analytics (PostHog)

PostHog loads on every page from `src/components/PostHog.astro`. It reads two environment variables at build time:

- `PUBLIC_POSTHOG_KEY`: the project API key (starts with `phc_`)
- `PUBLIC_POSTHOG_HOST`: `https://us.i.posthog.com`

For local builds, copy `.env.example` to `.env` and fill in the key. `.env` is ignored by git. For the live site, add both variables in Vercel under Settings > Environment Variables, then redeploy. If the key isn't set, the site builds as normal and PostHog stays off.

Then add your domain in Google Search Console and submit `https://yourdomain.com/sitemap-index.xml`.

## Search engines and AI assistants

- `robots.txt`, `llms.txt`, `llms-full.txt` and a Markdown copy of each post (`/journal/<post-name>.md`) are generated on every build, so new posts show up in them automatically.
- **IndexNow (Bing):** each production deploy on Vercel compares the new sitemap with the live one and reports new or changed pages to IndexNow, which shares them with Bing. The key is the public file `public/ed491aa9a8ccb24676f587de09d3646b.txt`. To see what would be sent without sending it, build with `INDEXNOW_DRY_RUN=1 npm run build`.
