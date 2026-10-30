// Track of the week controller. One store holds the state (see store.ts); taps, keys, swipes and the platform's own
// events only ever change the store, and render() draws every part of the UI from it.
//
// The <section id="tow"> is persisted across page changes by Astro (transition:persist), so this module sets it up once.
// The iframe or <audio> doing the playing lives in #tow-engine, a child of <html> outside <body>: Astro swaps <body> on
// navigation and never touches it there, so it is never moved or re-created, in any browser.
import { createStore, type State, type Status } from './store';
import { soundcloud, file, bandcamp, type Adapter, type Events } from './adapters';

interface Config { title: string; artist: string; platform: 'soundcloud' | 'bandcamp' | 'spotify' | 'youtube' | 'file'; src: string; link: string; artwork: string; week: string; label: string }

const SESSION = 'strukt-tow';
const SEEN = 'strukt-tow-seen';
const PLATFORM: Record<string, string> = { soundcloud: 'SoundCloud', bandcamp: 'Bandcamp', spotify: 'Spotify', youtube: 'YouTube', file: 'STRUKT' };
const SLOT_HEIGHT: Record<string, number> = { soundcloud: 166, bandcamp: 120, file: 54 };
const SHEET_MS = 320;

const phone = matchMedia('(max-width: 700px)');
const coarse = matchMedia('(pointer: coarse)');
const still = matchMedia('(prefers-reduced-motion: reduce)');

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const read = (store: Storage, key: string) => { try { return store.getItem(key); } catch { return null; } };
const write = (store: Storage, key: string, v: string) => { try { store.setItem(key, v); } catch { /* storage blocked: just not remembered */ } };

let booted = false;
let pageInit: () => void = () => {};

export function start() {
  if (!booted) booted = setup();
  pageInit();
}

function setup(): boolean {
  const root = document.getElementById('tow');
  if (!root) return false;
  const cfg: Config = JSON.parse(root.dataset.config || '{}');
  const name = `${cfg.title} by ${cfg.artist}`;
  const platform = PLATFORM[cfg.platform] ?? 'the platform';
  const q = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const qa = <T extends Element = HTMLElement>(s: string) => [...root.querySelectorAll<T>(s)];

  const dock = q('[data-dock]');
  const panel = q('[data-panel]');
  const panelBtn = q<HTMLButtonElement>('[data-panel-btn]');
  const wrap = q('[data-sheet-wrap]');
  const sheet = q('[data-sheet]');
  const sheetBody = q('[data-sheet-body]');
  const backdrop = q('[data-backdrop]');
  const handle = q<HTMLButtonElement>('[data-handle]');
  const slotFrame = q('[data-slot-frame]');
  const note = q('[data-note]');
  const fab = q<HTMLButtonElement>('[data-fab]');
  const live = q('[data-live]');
  const marquee = q('[data-marquee]');
  const plays = qa<HTMLButtonElement>('[data-play]');
  const sliders = qa('[data-slider]');
  const played = qa('[data-played]');
  const bufs = qa('[data-buf]');
  const knobs = qa('[data-knob]');
  const tip = q('[data-tip]');
  const elapsed = qa('[data-elapsed]');
  const totals = qa('[data-total]');
  const artists = qa('[data-artist]');
  const arts = qa('[data-art]');
  const artImgs = qa<HTMLImageElement>('[data-art-img]');
  const eqCols = qa('[data-eq] .col');

  /* ---------- engine host, outside <body> ---------- */
  let host = document.getElementById('tow-engine');
  if (!host) {
    host = document.createElement('div');
    host.id = 'tow-engine';
    host.className = 'tow-engine';
    host.setAttribute('aria-hidden', 'true');
    host.inert = true;
    document.documentElement.append(host);
  }
  const engine = host;
  engine.style.setProperty('--slot-h', `${/size=small/.test(cfg.src) ? 42 : SLOT_HEIGHT[cfg.platform] ?? 166}px`);
  root.style.setProperty('--slot-h', engine.style.getPropertyValue('--slot-h'));

  /* ---------- state ---------- */
  let saved: { view?: string; pos?: number; dur?: number; art?: string } | null = null;
  try { saved = JSON.parse(read(sessionStorage, SESSION) || 'null'); } catch { saved = null; }
  const firstVisit = root.dataset.enter === 'wait';
  const store = createStore({
    status: saved?.pos && saved.pos > 0 ? 'paused' : 'idle',
    position: saved?.pos ?? 0,
    duration: saved?.dur ?? 0,
    buffered: 0,
    scrub: null,
    view: saved?.view === 'collapsed' ? 'collapsed' : 'open',
    sheet: false,
    panel: false,
    embed: false,
    blocked: false,
    artwork: saved?.art || cfg.artwork || '',
    hint: firstVisit,
    keyboard: false,
    duck: false,
  });
  const get = store.get;
  const set = store.set;

  const capture = (event: string, extra: Record<string, unknown> = {}) => {
    try { (window as any).posthog?.capture?.(event, { title: cfg.title, artist: cfg.artist, platform: cfg.platform, week: cfg.week, ...extra }); } catch { /* analytics off */ }
  };
  const errorNote = `The player didn't load. ${cfg.title} is still on ${platform}.`;
  let embedNote = '';
  const say = (text: string) => { live.textContent = ''; requestAnimationFrame(() => (live.textContent = text)); };

  let saveTimer = 0;
  const save = (now = false) => {
    const run = () => { const s = get(); write(sessionStorage, SESSION, JSON.stringify({ view: s.view, pos: Math.round(s.position * 10) / 10, dur: s.duration, art: s.artwork })); };
    clearTimeout(saveTimer);
    now ? run() : (saveTimer = window.setTimeout(run, 800));
  };
  addEventListener('pagehide', () => save(true));

  /* ---------- playback ---------- */
  let everStarted = false; // the platform has played this session, so it's already at the right position
  let accepted = false; // the platform accepted the current play request
  let lastPos: number | null = null; // last reported position while waiting for audio
  let moved = false; // the audio has moved since the last play request
  let lastAdvance = 0;
  let blockTimer = 0;
  let lastTap = 0;
  let seekTo: number | null = null, seekUntil = 0; // until the platform catches up with a seek, its older positions are ignored

  const events: Events = {
    ready({ duration, artwork }) {
      set({ duration: duration || get().duration, ...(artwork ? { artwork } : {}) });
      save();
    },
    started() {
      accepted = true; everStarted = true; clearTimeout(blockTimer);
      const s = get().status;
      if (s !== 'loading' && s !== 'playing') {
        // started from the platform's own player (the fallback in the sheet)
        lastPos = null; moved = false;
        set({ status: 'loading', hint: false });
        capture('track_play', { source: 'embed' });
      }
    },
    progress(position, duration, buffered) {
      if (seekTo != null) {
        if (Math.abs(position - seekTo) > 1.5 && performance.now() < seekUntil) return;
        seekTo = null;
      }
      const s = get();
      if (s.status === 'ended' && !accepted) return; // the platform rewinds after the finish; the bar stays at the end until replay
      const advanced = lastPos != null && position > lastPos + 0.01;
      lastPos = position;
      if (advanced) { lastAdvance = performance.now(); moved = true; }
      const patch: Partial<State> = { position, buffered, ...(duration ? { duration } : {}) };
      if (advanced && (s.status === 'loading' || (accepted && s.status !== 'playing' && s.status !== 'ended'))) {
        patch.status = 'playing';
        if (s.blocked) patch.blocked = false;
      }
      set(patch);
      save();
    },
    paused() {
      const s = get();
      if (s.status === 'ended' || s.status === 'error') return;
      // our own pause has already set the state. A pause while still waiting for audio, before it ever moved,
      // is the browser refusing to start it (SoundCloud reports PLAY, then PAUSE)
      if (s.status === 'loading' && !moved) return events.blocked();
      accepted = false; clearTimeout(blockTimer);
      if (s.status === 'playing' || s.status === 'loading') {
        set({ status: 'paused' });
        // the platform pauses a moment before it reports the finish; that isn't a listener pausing
        if (!(s.duration && s.position >= s.duration - 1.5)) capture('track_pause', { source: 'embed' });
      }
      save(true);
    },
    ended() {
      accepted = false;
      set({ status: 'ended', position: get().duration || get().position });
      capture('track_complete');
      save(true);
    },
    blocked() {
      accepted = false; clearTimeout(blockTimer);
      const s = get();
      set({ status: s.position > 0 ? 'paused' : 'idle', blocked: true });
      openSheet('blocked');
    },
    error() {
      accepted = false; clearTimeout(blockTimer);
      set({ status: 'error' });
      say(errorNote);
    },
  };

  const adapter: Adapter =
    cfg.platform === 'file' ? file(engine, cfg.src, events)
    : cfg.platform === 'bandcamp' ? bandcamp(engine, cfg.src, cfg.title)
    : soundcloud(engine, cfg.src, cfg.title, events);

  function play(source = 'player') {
    const s = get();
    if (!adapter.controllable) return openSheet('listen');
    if (s.status === 'error') {
      capture(cfg.platform === 'soundcloud' ? 'track_soundcloud_click' : 'track_platform_click', { source: 'error' });
      window.open(cfg.link, '_blank', 'noopener');
      return;
    }
    const from = s.status === 'ended' ? 0 : !everStarted && s.position > 0 ? s.position : undefined;
    accepted = false; lastPos = null; moved = false;
    set({ status: 'loading', hint: false, blocked: false, ...(s.status === 'ended' ? { position: 0 } : {}) });
    if (firstVisit) write(localStorage, SEEN, '1');
    const go = () => {
      if (get().status !== 'loading') return;
      adapter.play(from);
      clearTimeout(blockTimer);
      // no word from the platform: the browser most likely held it back
      blockTimer = window.setTimeout(() => { if (get().status === 'loading' && !accepted) events.blocked(); }, 4000);
    };
    // straight from the tap when the platform is ready, so the browser counts it as the user's own play
    if (adapter.loaded) go(); else adapter.load().then(go, () => events.error());
    capture('track_play', { source });
  }

  function pause(source = 'player') {
    const s = get();
    clearTimeout(blockTimer);
    accepted = false;
    adapter.pause();
    set({ status: everStarted || s.position > 0 ? 'paused' : 'idle' });
    if (s.status === 'playing') capture('track_pause', { source });
    save(true);
  }

  function toggle(source = 'player') {
    const now = performance.now();
    if (now - lastTap < 350) return; // a double tap is one tap
    lastTap = now;
    const s = get().status;
    s === 'playing' || s === 'loading' ? pause(source) : play(source);
  }

  function seek(seconds: number) {
    const s = get();
    if (!s.duration || !adapter.controllable) return;
    const to = clamp(seconds, 0, s.duration);
    adapter.seek(to);
    seekTo = to; seekUntil = performance.now() + 2000;
    lastPos = null;
    set({ position: to, status: s.status === 'ended' || (s.status === 'idle' && to > 0) ? 'paused' : s.status });
    save();
    mediaPosition();
  }

  // audio stalls mid-track: show buffering until it moves again
  setInterval(() => {
    if (document.hidden || get().status !== 'playing') return;
    if (performance.now() - lastAdvance > 2500) { lastPos = null; set({ status: 'loading' }); }
  }, 1000);
  document.addEventListener('visibilitychange', () => { lastAdvance = performance.now(); eqLoop(); });

  // load the platform once the page is quiet, so the first tap plays straight away
  const preload = () => { if (adapter.controllable && !adapter.loaded) adapter.load().catch(() => events.error()); };
  const idle = (fn: () => void) => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1500));
  document.readyState === 'complete' ? idle(preload) : addEventListener('load', () => idle(preload), { once: true });

  /* ---------- views: collapse, credits panel, sheet ---------- */
  let opener: HTMLElement | null = null;

  function collapse(on: boolean, focus = true) {
    set({ view: on ? 'collapsed' : 'open', ...(on ? { panel: false, sheet: false, embed: false } : {}) });
    save(true);
    if (focus) requestAnimationFrame(() => (on ? fab : plays[0]).focus({ preventScroll: true }));
  }

  function openPanel() {
    opener = panelBtn;
    set({ panel: true });
    capture('track_credits_open', { source: 'panel' });
    requestAnimationFrame(() => panel.querySelector<HTMLElement>('.tow-panel-body')!.focus({ preventScroll: true }));
  }
  function closePanel(focus = true) {
    if (!get().panel) return;
    set({ panel: false });
    if (focus) panelBtn.focus({ preventScroll: true });
  }

  function openSheet(why: 'tap' | 'blocked' | 'listen') {
    if (!get().sheet) opener = (document.activeElement as HTMLElement) || null;
    const text = why === 'blocked'
      ? `Your browser wants the first tap on ${platform}'s own player. Press play on it here and our controls take over from there.`
      : why === 'listen' ? `${platform} doesn't let other sites start its player, so here's theirs. Press play on it.` : '';
    if (text) embedNote = text;
    set({ sheet: true, panel: false, ...(text ? { embed: true } : {}) });
    if (why === 'tap') capture('track_credits_open', { source: 'sheet' });
    if (why === 'listen') adapter.load();
    if (text) say(text);
    requestAnimationFrame(() => (why === 'tap' ? sheet.querySelector<HTMLElement>('.tow-play-lg')! : handle).focus({ preventScroll: true }));
  }
  function closeSheet(focus = true) {
    if (!get().sheet) return;
    set({ sheet: false, embed: false });
    if (focus && opener && document.contains(opener) && !opener.closest('[inert]')) opener.focus({ preventScroll: true });
    else if (focus) (get().view === 'collapsed' ? fab : plays[0]).focus({ preventScroll: true });
  }

  /* ---------- the platform's own player, on show in the sheet ---------- */
  let placeTimer = 0;
  function placeEngine() {
    const s = get();
    clearTimeout(placeTimer);
    if (!(s.sheet && s.embed)) { engine.classList.remove('show'); engine.inert = true; engine.setAttribute('aria-hidden', 'true'); return; }
    const put = () => {
      const r = slotFrame.getBoundingClientRect();
      Object.assign(engine.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px` });
      engine.classList.add('show'); engine.inert = false; engine.removeAttribute('aria-hidden');
    };
    placeTimer = window.setTimeout(put, still.matches ? 0 : SHEET_MS + 10);
  }
  addEventListener('resize', () => { if (engine.classList.contains('show')) { engine.classList.remove('show'); placeEngine(); } });

  /* ---------- equaliser: requestAnimationFrame only while playing and on screen ---------- */
  let raf = 0, lastStep = 0;
  const level = [1, 1, 1, 1, 1], target = [2, 3, 4, 3, 2];
  const paint = (lv: number[]) => eqCols.forEach((c, i) => (c.dataset.l = String(lv[i % 5])));
  function tick(t: number) {
    if (t - lastStep > 95) {
      lastStep = t;
      for (let i = 0; i < 5; i++) {
        if (level[i] === target[i]) target[i] = 1 + Math.floor(Math.random() * 4);
        level[i] += Math.sign(target[i] - level[i]);
      }
      paint(level);
    }
    raf = requestAnimationFrame(tick);
  }
  function eqLoop() {
    const playing = get().status === 'playing';
    const run = playing && !document.hidden && !still.matches;
    if (run && !raf) raf = requestAnimationFrame(tick);
    if (!run) {
      cancelAnimationFrame(raf); raf = 0;
      paint(playing ? [2, 3, 4, 3, 2] : [1, 1, 1, 1, 1]);
    }
  }
  still.addEventListener('change', eqLoop);

  /* ---------- Media Session: lock screen and headphone controls ---------- */
  const ms = 'mediaSession' in navigator ? navigator.mediaSession : null;
  function mediaPosition() {
    const s = get();
    if (!ms?.setPositionState || !s.duration) return;
    try { ms.setPositionState({ duration: s.duration, position: clamp(s.position, 0, s.duration), playbackRate: 1 }); } catch { /* not supported */ }
  }
  function media(s: State) {
    if (!ms || !adapter.controllable) return;
    try {
      ms.metadata = new MediaMetadata({
        title: cfg.title,
        artist: cfg.artist,
        album: `STRUKT ${cfg.label}`,
        artwork: s.artwork ? [{ src: s.artwork, sizes: '500x500', type: 'image/jpeg' }] : [{ src: '/favicon.png', sizes: '512x512', type: 'image/png' }],
      });
      ms.playbackState = s.status === 'playing' || s.status === 'loading' ? 'playing' : s.status === 'paused' ? 'paused' : 'none';
    } catch { /* not supported */ }
    mediaPosition();
  }
  if (ms && adapter.controllable) {
    const on = (a: MediaSessionAction, fn: MediaSessionActionHandler) => { try { ms.setActionHandler(a, fn); } catch { /* action not supported */ } };
    on('play', () => play('media'));
    on('pause', () => pause('media'));
    on('seekto', (d) => d.seekTime != null && seek(d.seekTime));
    on('seekbackward', (d) => seek(get().position - (d.seekOffset || 10)));
    on('seekforward', (d) => seek(get().position + (d.seekOffset || 10)));
  }

  /* ---------- render: the whole UI from the state ---------- */
  const playLabel: Record<Status, string> = {
    idle: `Play ${name}`, paused: `Play ${name}`, loading: `Pause ${name}`, playing: `Pause ${name}`,
    ended: `Play ${name} again`, error: `Listen on ${platform}`,
  };
  function artistLine(s: State) {
    if (!adapter.controllable) return cfg.artist;
    if (s.status === 'error') return "The player didn't load";
    if (s.status === 'ended') return 'Play again';
    if (s.status === 'idle' && s.hint) return 'Tap to play';
    return cfg.artist;
  }

  store.subscribe((s, p) => {
    const all = s === p;
    const ch = (k: keyof State) => all || s[k] !== p[k];

    if (ch('status')) {
      root.dataset.status = s.status;
      plays.forEach((b) => {
        b.setAttribute('aria-label', adapter.controllable ? playLabel[s.status] : `Listen on ${platform}`);
        if (adapter.controllable && s.status !== 'error') b.setAttribute('aria-pressed', String(s.status === 'playing' || s.status === 'loading'));
        else b.removeAttribute('aria-pressed');
      });
      eqLoop();
      media(s);
      if (s.status === 'playing' || s.status === 'loading') lastAdvance = performance.now();
    }
    if (ch('status') || ch('hint')) artists.forEach((a, i) => (a.textContent = i === 0 ? artistLine(s) : s.status === 'error' ? "The player didn't load" : cfg.artist));
    if (ch('view')) root.dataset.view = s.view;
    if (ch('keyboard') || ch('duck')) root.toggleAttribute('data-hide', s.keyboard || s.duck);
    if (ch('panel')) {
      root.toggleAttribute('data-panel-open', s.panel);
      panel.inert = !s.panel;
      panelBtn.setAttribute('aria-expanded', String(s.panel));
    }
    if (ch('sheet')) {
      root.toggleAttribute('data-sheet-open', s.sheet);
      wrap.inert = !s.sheet;
      document.body.style.overflow = s.sheet ? 'hidden' : '';
    }
    if (ch('embed')) root.toggleAttribute('data-embed', s.embed);
    if (ch('embed') || ch('status')) note.textContent = s.embed ? embedNote : s.status === 'error' ? errorNote : '';
    if (ch('sheet') || ch('embed')) placeEngine();
    if (ch('artwork') && s.artwork) {
      artImgs.forEach((img) => {
        img.onload = () => arts.forEach((a) => a.classList.add('has-art'));
        img.src = s.artwork;
      });
      media(s);
    }
    if (ch('position') || ch('duration') || ch('buffered') || ch('scrub')) {
      const pos = s.scrub ?? s.position;
      const r = s.duration ? clamp(pos / s.duration, 0, 1) : 0;
      played.forEach((e) => (e.style.transform = `scaleX(${r})`));
      bufs.forEach((e) => (e.style.transform = `scaleX(${clamp(s.buffered, 0, 1)})`));
      knobs.forEach((e) => (e.style.transform = `translateX(${r * 100}%)`));
      elapsed.forEach((e) => (e.textContent = fmt(pos)));
      if (ch('duration')) totals.forEach((e) => (e.textContent = s.duration ? fmt(s.duration) : '–:––'));
      sliders.forEach((e) => {
        e.setAttribute('aria-valuemax', String(Math.round(s.duration)));
        e.setAttribute('aria-valuenow', String(Math.round(pos)));
        e.setAttribute('aria-valuetext', s.duration ? `${fmt(pos)} of ${fmt(s.duration)}` : fmt(pos));
        e.setAttribute('aria-disabled', String(!s.duration));
      });
    }
  });

  /* ---------- buttons ---------- */
  plays.forEach((b) => b.addEventListener('click', () => toggle(b.closest('[data-sheet]') ? 'sheet' : 'player')));
  qa('[data-collapse]').forEach((b) => b.addEventListener('click', () => collapse(true)));
  fab.addEventListener('click', () => collapse(false));
  panelBtn.addEventListener('click', () => (get().panel ? closePanel() : openPanel()));
  handle.addEventListener('click', () => { if (!handleDragged) closeSheet(); });
  backdrop.addEventListener('click', () => closeSheet());
  q('[data-open-sheet]').addEventListener('click', () => { if (swiped) { swiped = false; return; } openSheet('tap'); });
  qa('[data-buy]').forEach((a) => a.addEventListener('click', () => capture('track_buy_click', { source: a.closest('[data-sheet]') ? 'sheet' : 'panel' })));
  qa('[data-via]').forEach((a) => a.addEventListener('click', () => capture(cfg.platform === 'soundcloud' ? 'track_soundcloud_click' : 'track_platform_click', { source: a.closest('[data-sheet]') ? 'sheet' : a.closest('[data-panel]') ? 'panel' : 'bar' })));
  document.addEventListener('pointerdown', (e) => { if (get().panel && !dock.contains(e.target as Node)) closePanel(false); });
  // the archive's play button for this week's track plays it here, not in a second player
  document.addEventListener('tow:play', () => { if (get().view === 'collapsed') collapse(false, false); play('archive'); });

  /* ---------- keyboard: Escape closes, Tab stays inside an open sheet or panel ---------- */
  const focusables = (box: HTMLElement) => {
    const list = [...box.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"], [tabindex="-1"].tow-panel-body')]
      .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
    // the platform's own player sits outside the sheet in the DOM, but on screen it's just under the handle
    if (box === sheet && engine.classList.contains('show')) { const f = engine.querySelector('iframe, audio'); if (f) list.splice(1, 0, f as HTMLElement); }
    return list;
  };
  document.addEventListener('keydown', (e) => {
    const s = get();
    const box = s.sheet ? sheet : s.panel ? panel : null;
    if (!box) return;
    if (e.key === 'Escape') { e.preventDefault(); s.sheet ? closeSheet() : closePanel(); return; }
    if (e.key !== 'Tab') return;
    const list = focusables(box);
    if (!list.length) return;
    const i = list.indexOf(document.activeElement as HTMLElement);
    e.preventDefault();
    list[(i + (e.shiftKey ? -1 : 1) + list.length) % list.length].focus();
  });

  /* ---------- scrubbers: drag, click, arrow keys ---------- */
  sliders.forEach((el) => {
    let dragging = false;
    const at = (x: number) => { const r = el.getBoundingClientRect(); return clamp((x - r.left) / r.width, 0, 1) * get().duration; };
    el.addEventListener('pointerdown', (e) => {
      if (!get().duration || e.button > 0) return;
      e.preventDefault(); e.stopPropagation();
      dragging = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add('drag');
      set({ scrub: at(e.clientX) });
    });
    el.addEventListener('pointermove', (e) => {
      if (dragging) set({ scrub: at(e.clientX) });
      if (el === sliders[0] && get().duration) {
        const r = el.getBoundingClientRect();
        tip.textContent = fmt(at(e.clientX));
        tip.style.transform = `translateX(${clamp(e.clientX - r.left, 0, r.width)}px)`;
      }
    });
    const end = (commit: boolean) => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('drag');
      const to = get().scrub;
      set({ scrub: null });
      if (commit && to != null) seek(to);
    };
    el.addEventListener('pointerup', () => end(true));
    el.addEventListener('pointercancel', () => end(false));
    el.addEventListener('keydown', (e) => {
      const s = get();
      if (!s.duration) return;
      const step: Record<string, number> = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -30, PageUp: 30 };
      if (e.key in step) seek(s.position + step[e.key]);
      else if (e.key === 'Home') seek(0);
      else if (e.key === 'End') seek(s.duration - 1);
      else return;
      e.preventDefault();
    });
  });

  /* ---------- phones: swipe the docked card down to collapse ---------- */
  let swiped = false;
  {
    let y0 = 0, dy = 0, id = -1, active = false;
    dock.addEventListener('pointerdown', (e) => {
      if (!phone.matches || e.button > 0 || (e.target as Element).closest('[data-play], [data-slider], .tow-panel')) return;
      y0 = e.clientY; dy = 0; id = e.pointerId; active = false; swiped = false;
    });
    dock.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      dy = e.clientY - y0;
      if (!active && Math.abs(dy) > 8) { active = true; dock.setPointerCapture(id); dock.classList.add('drag'); }
      if (active) dock.style.translate = `0 ${Math.max(0, dy)}px`;
    });
    const end = () => {
      if (id < 0) return;
      id = -1;
      if (!active) return;
      swiped = true; // the click that follows a swipe isn't a tap
      setTimeout(() => (swiped = false), 400);
      dock.classList.remove('drag');
      if (dy > 40) {
        collapse(true, false);
        setTimeout(() => (dock.style.translate = ''), 260);
      } else dock.style.translate = '';
    };
    dock.addEventListener('pointerup', end);
    dock.addEventListener('pointercancel', end);
  }

  /* ---------- the sheet: swipe down to close (touch anywhere when scrolled to the top; mouse on the handle) ---------- */
  let handleDragged = false;
  {
    let y0 = 0, dy = 0, t0 = 0, can = false, active = false;
    const begin = (y: number, ok: boolean) => { y0 = y; dy = 0; t0 = performance.now(); can = ok; active = false; };
    const move = (y: number) => {
      if (!can) return false;
      dy = y - y0;
      if (!active) {
        if (dy < -4) { can = false; return false; } // scrolling up through the sheet
        if (dy < 6) return false;
        active = true;
        sheet.classList.add('drag');
        engine.classList.remove('show');
      }
      sheet.style.translate = `0 ${Math.max(0, dy)}px`;
      backdrop.style.opacity = String(clamp(1 - dy / sheet.offsetHeight, 0, 1));
      return true;
    };
    const finish = () => {
      if (!active) return;
      active = false; can = false;
      sheet.classList.remove('drag');
      sheet.style.translate = ''; backdrop.style.opacity = '';
      const fast = dy / (performance.now() - t0) > 0.5;
      if (dy > sheet.offsetHeight * 0.22 || (fast && dy > 30)) closeSheet(); else placeEngine();
    };
    sheet.addEventListener('touchstart', (e) => {
      const t = e.target as Element;
      begin(e.touches[0].clientY, e.touches.length === 1 && !t.closest('[data-slider]') && (sheetBody.scrollTop <= 0 || !sheetBody.contains(t)));
    }, { passive: true });
    sheet.addEventListener('touchmove', (e) => { if (move(e.touches[0].clientY)) e.preventDefault(); }, { passive: false });
    sheet.addEventListener('touchend', finish);
    sheet.addEventListener('touchcancel', finish);
    handle.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      handleDragged = false;
      begin(e.clientY, true);
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && e.buttons && move(e.clientY)) handleDragged = true; });
    handle.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') { finish(); setTimeout(() => (handleDragged = false)); } });
  }

  /* ---------- page padding from the bar's real height ---------- */
  const applySpace = () => {
    const gap = phone.matches ? 8 : 16;
    document.documentElement.style.setProperty('--tow-space', `${dock.offsetHeight + gap * 2}px`);
  };
  new ResizeObserver(applySpace).observe(dock);
  document.addEventListener('astro:after-swap', applySpace); // the new page's <html> attributes replace ours

  /* ---------- phones: keep out of the keyboard's way ---------- */
  let baseline = innerHeight, baseWidth = innerWidth;
  const typing = () => (document.activeElement as Element | null)?.matches?.('input:not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]):not([type=range]), textarea, select, [contenteditable]:not([contenteditable=false])') ?? false;
  const keyboard = () => {
    if (innerWidth !== baseWidth) { baseWidth = innerWidth; baseline = innerHeight; }
    baseline = Math.max(baseline, innerHeight);
    const vv = window.visualViewport;
    const shrunk = (vv ? baseline - vv.height : 0) > 120 || baseline - innerHeight > 120;
    set({ keyboard: phone.matches && typing() && (shrunk || coarse.matches) });
  };
  window.visualViewport?.addEventListener('resize', keyboard);
  addEventListener('resize', keyboard);
  document.addEventListener('focusin', keyboard);
  document.addEventListener('focusout', () => setTimeout(keyboard, 120));

  /* ---------- never sit over the form's send button or a call to action ---------- */
  let duckTargets: Element[] = [];
  let duckQueued = false;
  const duck = () => {
    duckQueued = false;
    const s = get();
    if (!duckTargets.length || s.sheet) return set({ duck: false });
    const box = s.view === 'collapsed' ? fab : dock;
    // offset* ignore transforms, so this is where the bar sits even while it's tucked away
    const L = box.offsetLeft - 8, T = box.offsetTop - 8, R = L + box.offsetWidth + 16, B = T + box.offsetHeight + 16;
    set({ duck: duckTargets.some((t) => { const r = t.getBoundingClientRect(); return r.width > 0 && r.right > L && r.left < R && r.bottom > T && r.top < B; }) });
  };
  const queueDuck = () => { if (!duckQueued) { duckQueued = true; requestAnimationFrame(duck); } };
  addEventListener('scroll', queueDuck, { passive: true });
  addEventListener('resize', queueDuck);
  store.subscribe((s, p) => { if (s.view !== p.view || s.sheet !== p.sheet) queueDuck(); });

  /* ---------- phones: a title too long for the card scrolls gently ---------- */
  const measureTitle = () => {
    const inner = marquee.firstElementChild as HTMLElement;
    const over = inner.scrollWidth - marquee.clientWidth;
    marquee.classList.toggle('scroll', over > 2);
    marquee.style.setProperty('--shift', `${-(over + 16)}px`);
  };
  // on phones the card's line only shows progress; the sheet has the scrubber
  const dockSlider = () => {
    sliders[0].tabIndex = phone.matches ? -1 : 0;
    sliders[0].toggleAttribute('aria-hidden', phone.matches);
  };
  dockSlider();
  phone.addEventListener('change', () => { dockSlider(); measureTitle(); applySpace(); if (phone.matches) closePanel(false); });
  document.fonts?.ready.then(measureTitle);

  /* ---------- entrance: first visit only, once the page has settled ---------- */
  if (firstVisit) {
    const go = () => setTimeout(() => {
      root.dataset.enter = 'go';
      write(localStorage, SEEN, '1');
      setTimeout(() => delete root.dataset.enter, 320);
    }, still.matches ? 0 : 600);
    document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true });
  }

  /* ---------- every page change ---------- */
  document.addEventListener('astro:before-preparation', () => { closeSheet(false); closePanel(false); });
  pageInit = () => {
    duckTargets = [...document.querySelectorAll('#cf button[type=submit], .cta a')];
    applySpace();
    keyboard();
    queueDuck();
    measureTitle();
  };
  return true;
}
