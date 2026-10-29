# STRUKT media brief: first two journal posts

This file tells whoever sources media (Claude Code or a person) exactly what each post needs, where it may come from, and how to save it permanently in the site.

---

## Rules for every asset

**Allowed sources for files we save into the site**
- Unsplash (unsplash.com) and Pexels (pexels.com): photos and videos. Check the asset's own page says it's free to use. Skip anything marked Unsplash+, premium or "sponsored".
- Pixabay and Mixkit: free stock video clips only, after checking the clip's licence page.
- Wikimedia Commons: only files whose licence is CC0, public domain, CC BY or CC BY-SA. Record the author, licence and file page for every one. CC BY-SA images must keep the same licence noted in the credit.
- Our own material: photos we take, screenshots of free software we run ourselves, and original STRUKT illustrations.

**Never save into the site**
- Getty, Alamy, Adobe Stock, Shutterstock or any paid library.
- Photos from museum or archive collections (Science Museum Group, British Culture Archive and similar) unless we have written permission.
- Anything from Google Images, Pinterest or social media.
- YouTube videos. Those are embedded only, never downloaded (see below).

**Embedded video (not saved)**
- Only official uploads (the artist's, venue's, manufacturer's or broadcaster's own channel).
- Embed with the youtube-nocookie.com domain, lazy-loaded, inside a figure with a caption naming the source channel.

**Saving files**
- Photos go in `public/images/journal/<post-slug>/`, as WebP. Full-width images are 2000px wide, in-body images 1400px wide, quality around 75.
- Video loops go in `public/video/journal/<post-slug>/`: MP4 (H.264) under 4 MB, muted, 6 to 12 seconds, 1280px wide, plus a WebP poster frame from the first second.
- File names describe the content: `lighting-console-hands.webp`, not `IMG_2041.webp`.
- Every asset gets an entry in `src/data/media-credits.json` with: file path, post slug, description, creator, source page URL, licence, and the exact credit line shown on the site.

**Captions**
Every photo and video gets a caption with a credit line in this form:
`Photo: Name, Unsplash` or `Video: Name, Pexels` or `Photo: Name, CC BY-SA 4.0, via Wikimedia Commons`.

**Visual treatment**
Pick images that are already dark, moody and real-looking: actual venues, actual crews, haze and beams. Avoid bright, posed, corporate-looking stock. The site applies the violet duotone treatment automatically, so colour doesn't matter, but the image must have enough light in it to read once tinted.

---

## Post 1: How to become a lighting technician for clubs and festivals
Slug: `how-to-become-a-lighting-technician`

| # | Placement | What to find | Search terms to try | Type |
|---|---|---|---|---|
| 1 | Hero | Keep the current image (Xavi Cabrera, stage fixtures on a pole). Download it and self-host. | (existing) | Photo, Unsplash |
| 2 | After "What the job actually is" | Hands on a professional lighting console in a dark booth, faders and screens glowing | lighting console, lighting desk, light operator concert | Photo |
| 3 | In "Learn to program" | A laptop running lighting control or a 3D visualiser, ideally in a dark room. Best option: our own screenshot of grandMA3 onPC or MagicQ's visualiser running the practice rig from the article. | lighting software laptop, show control laptop | Our screenshot, or photo |
| 4 | In "Learn to program" | Short loop of moving-head beams sweeping through haze | moving head lights haze, stage lights beams loop, concert lights smoke | Video loop |
| 5 | In "The jobs that take beginners" | Crew building truss or unloading a truck at load-in | stage setup crew, load in concert, truss assembly | Photo |
| 6 | In "The jobs that take beginners" | Timelapse of a stage or festival build | stage construction timelapse, festival stage build | Video loop |
| 7 | In "Warehouse prep" paragraph | Flight cases, cable racks or fixtures on warehouse shelves | road cases, flight cases warehouse, cable storage | Photo |
| 8 | In "Safety is the part that gets you called back" | A rigger working at height in a harness, or a close-up of a safety cable on a fixture | rigger harness truss, stage rigging, safety cable light | Photo |
| 9 | Optional embed in "Learn to program" | An official beginner tutorial from MA Lighting's or ChamSys's own YouTube channel | grandMA3 onPC getting started, MagicQ beginner tutorial | YouTube embed |

---

## Post 2: The designers behind Studio 54, the Paradise Garage and the Haçienda
Slug: `the-designers-behind-legendary-clubs`

Historical photos of these clubs are almost all owned by photographers, archives and agencies, so this post uses three kinds of image: openly licensed photos of the buildings, original STRUKT illustrations, and embedded video from official sources.

| # | Placement | What to find | Where | Type |
|---|---|---|---|---|
| 1 | Hero | Keep the current image (Kajetan Sumila, crowd with hands raised). Download and self-host. | (existing) | Photo, Unsplash |
| 2 | "The room: Ben Kelly and the Haçienda" | Exterior of the Haçienda building or the Haçienda Apartments that replaced it, ideally showing the commemorative plaque | Wikimedia Commons, category "The Haçienda" | Photo, CC licence |
| 3 | Same section | Original STRUKT illustration: an iron column painted in yellow and black diagonal hazard stripes, drawn in the site's dot style, with a traffic bollard beside it | Made in-house | Illustration |
| 4 | "The light: Joshua White and the Fillmore East" | The Fillmore East building at 105 Second Avenue, New York, any era | Wikimedia Commons, category "Fillmore East" | Photo, CC licence |
| 5 | Same section | Official footage of the Joshua Light Show, from the Joshua Light Show's own channel or a museum or broadcaster | YouTube, official uploads only | YouTube embed |
| 6 | Same section, optional | Original STRUKT illustration of how a liquid light show works: an overhead projector, a clock glass of oil and coloured dye, and the beam onto a screen | Made in-house | Illustration |
| 7 | "The rig: Jules Fisher, Paul Marantz and Studio 54" | Exterior or marquee of 254 West 54th Street | Wikimedia Commons, category "Studio 54" | Photo, CC licence |
| 8 | "The sound: Richard Long and the Paradise Garage" | 84 King Street, New York, the Garage's former building | Wikimedia Commons, search "84 King Street" or "Paradise Garage" | Photo, CC licence |
| 9 | Same section | Original STRUKT illustration: a simplified cutaway of a large folded bass horn, marked "illustrative, not to scale" | Made in-house | Illustration |

If a Commons category has nothing usable under the allowed licences, leave that slot empty and list it in the pull request rather than substituting something unlicensed.

---

## How to put media into a Markdown post

Photo with caption:
```html
<figure class="post-figure">
  <img src="/images/journal/<slug>/<file>.webp" alt="What the image shows" width="1400" height="933" loading="lazy">
  <figcaption>What the image shows. <span class="credit">Photo: Name, Unsplash</span></figcaption>
</figure>
```

Video loop:
```html
<figure class="post-figure">
  <video src="/video/journal/<slug>/<file>.mp4" poster="/video/journal/<slug>/<file>.webp" autoplay muted loop playsinline preload="none"></video>
  <figcaption>What the clip shows. <span class="credit">Video: Name, Pexels</span></figcaption>
</figure>
```

YouTube embed:
```html
<figure class="post-figure embed">
  <iframe src="https://www.youtube-nocookie.com/embed/<VIDEO_ID>" title="What the video is" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>
  <figcaption>What the video is. <span class="credit">Video: Channel name, YouTube</span></figcaption>
</figure>
```
