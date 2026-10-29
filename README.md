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

1. In `astro.config.mjs` and `public/robots.txt`, replace `strukt.example` with your domain.
2. Connect the form in `public/scripts/strukt.js` (search for TODO) to wherever submissions should go.
3. Download the Unsplash photos and put them in `public/` if you'd rather host them yourself.

## Deploy on Vercel

1. Put this folder in a GitHub repository.
2. In Vercel, choose Add New Project and import the repository. Vercel detects Astro automatically.
3. Every time you push a new post, the site rebuilds and publishes it.

Then add your domain in Google Search Console and submit `https://yourdomain.com/sitemap-index.xml`.
