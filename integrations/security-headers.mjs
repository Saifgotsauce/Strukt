// Security headers for every response on Vercel: a Content Security Policy plus the usual hardening headers.
//
// It runs after the Vercel adapter has written .vercel/output/config.json and adds one route at the top that sets the
// headers on everything. The policy allows scripts only from this site and the services the site actually uses, plus the
// exact inline scripts and onerror handlers in this build, found by hashing them. So editing an inline script (the
// player's boot script, say) can't break the site: the new hash is picked up on the next build.
//
// Adding a new outside service (a new embed, font or analytics tool)? Add its origin to SOURCES below, or the browser
// will block it.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SOURCES = {
  // SoundCloud's Widget API (the player); PostHog loads its extensions (surveys, session replay) from its assets host
  script: ['https://w.soundcloud.com', 'https://*.posthog.com'],
  style: ['https://fonts.googleapis.com'],
  font: ['https://fonts.gstatic.com'],
  // photos hotlinked from Unsplash; track artwork from SoundCloud's image CDN
  img: ['https://images.unsplash.com', 'https://*.sndcdn.com'],
  // PostHog events; the call for creatives form posts to Formspree
  connect: ['https://*.posthog.com', 'https://formspree.io'],
  // the track of the week embeds and YouTube videos in posts
  frame: ['https://w.soundcloud.com', 'https://bandcamp.com', 'https://www.youtube-nocookie.com'],
  form: ['https://formspree.io'],
};

const sha = (s) => `'sha256-${crypto.createHash('sha256').update(s, 'utf8').digest('base64')}'`;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const decode = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

export function policy(dir) {
  const scripts = new Set(), handlers = new Set();
  for (const f of walk(dir)) {
    const html = fs.readFileSync(f, 'utf8');
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      const attrs = m[1];
      if (/\bsrc=/.test(attrs) || /type="application\/(ld\+)?json"/.test(attrs)) continue; // external, or data that never runs
      scripts.add(sha(m[2]));
    }
    for (const m of html.matchAll(/\son[a-z]+="([^"]*)"/g)) handlers.add(sha(decode(m[1])));
  }
  const hashes = [...scripts, ...(handlers.size ? ["'unsafe-hashes'", ...handlers] : [])];
  return [
    "default-src 'self'",
    `script-src 'self' ${[...hashes, ...SOURCES.script].join(' ')}`,
    `style-src 'self' 'unsafe-inline' ${SOURCES.style.join(' ')}`,
    `font-src 'self' ${SOURCES.font.join(' ')}`,
    `img-src 'self' data: blob: ${SOURCES.img.join(' ')}`,
    "media-src 'self' blob:",
    `connect-src 'self' ${SOURCES.connect.join(' ')}`,
    `frame-src ${SOURCES.frame.join(' ')}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' ${SOURCES.form.join(' ')}`,
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function headers(dir) {
  return {
    'Content-Security-Policy': policy(dir),
    'Strict-Transport-Security': 'max-age=63072000',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
}

export default function securityHeaders() {
  let root;
  return {
    name: 'strukt-security-headers',
    hooks: {
      'astro:config:done': ({ config }) => { root = fileURLToPath(config.root); },
      'astro:build:done': ({ dir, logger }) => {
        const h = headers(fileURLToPath(dir));
        const file = path.join(root, '.vercel/output/config.json');
        if (!fs.existsSync(file)) return logger.warn('no .vercel/output/config.json, so no headers were added');
        const config = JSON.parse(fs.readFileSync(file, 'utf8'));
        config.routes = (config.routes ?? []).filter((r) => r.src !== '^/(.*)$' || !r.headers?.['Content-Security-Policy']);
        config.routes.unshift({ src: '^/(.*)$', headers: h, continue: true });
        fs.writeFileSync(file, JSON.stringify(config, null, 2));
        logger.info(`security headers added (${h['Content-Security-Policy'].match(/sha256-/g)?.length ?? 0} inline hashes)`);
      },
    },
  };
}
