// Playback adapters: one per platform, all with the same shape, so the controller never cares where the audio comes from.
// Each adapter creates its iframe or <audio> once, inside a host element that lives outside <body> and is never moved,
// so changing page (Astro swaps <body>) can't reload it.

export interface Events {
  /** the platform is loaded and knows the track */
  ready(meta: { duration: number; artwork?: string }): void;
  /** playback was asked for and the platform accepted (audio may still be buffering) */
  started(): void;
  progress(position: number, duration: number, buffered: number): void;
  paused(): void;
  ended(): void;
  /** the browser refused to start playback without a tap on the player itself (iOS, strict autoplay settings) */
  blocked(): void;
  error(): void;
}

export interface Adapter {
  /** true once play() can be called straight from a tap */
  readonly loaded: boolean;
  /** false for platforms that can't be controlled from our buttons (Bandcamp) */
  readonly controllable: boolean;
  load(): Promise<void>;
  /** starts playing; startAt (seconds) resumes from a stored position */
  play(startAt?: number): void;
  pause(): void;
  seek(seconds: number): void;
}

/* ---------- SoundCloud: the Widget API drives a hidden iframe ---------- */
declare global {
  interface Window { SC?: any }
}
let scApi: Promise<any> | null = null;
const loadScApi = () =>
  (scApi ??= new Promise((resolve, reject) => {
    if (window.SC?.Widget) return resolve(window.SC);
    const s = document.createElement('script');
    s.src = 'https://w.soundcloud.com/player/api.js';
    s.async = true;
    s.onload = () => (window.SC?.Widget ? resolve(window.SC) : reject(new Error('SoundCloud API missing')));
    s.onerror = () => { scApi = null; reject(new Error('SoundCloud API blocked')); };
    document.head.append(s);
  }));

export function soundcloud(host: HTMLElement, embedUrl: string, title: string, on: Events): Adapter {
  let widget: any = null;
  let loading: Promise<void> | null = null;
  let loaded = false;
  let duration = 0;
  let buffered = 0;
  let pendingStart: number | null = null;
  let started = false; // the widget has played at least once, so seekTo works while paused
  let wantPlay = false; // we asked for play and haven't heard back

  const get = (method: string) => new Promise<any>((r) => widget[method](r));

  function load() {
    return (loading ??= (async () => {
      const SC = await loadScApi();
      const f = document.createElement('iframe');
      f.src = embedUrl;
      f.title = `${title} on SoundCloud`;
      f.allow = 'autoplay; encrypted-media';
      f.setAttribute('scrolling', 'no');
      host.append(f);
      widget = SC.Widget(f);
      const E = SC.Widget.Events;
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('SoundCloud widget timed out')), 15000);
        widget.bind(E.READY, () => { clearTimeout(t); resolve(); });
      });
      widget.bind(E.PLAY, () => {
        wantPlay = false; started = true;
        if (pendingStart != null) { widget.seekTo(pendingStart * 1000); pendingStart = null; }
        on.started();
      });
      widget.bind(E.PLAY_PROGRESS, (e: any) => {
        buffered = e.loadedProgress ?? buffered;
        on.progress(e.currentPosition / 1000, duration, buffered);
      });
      widget.bind(E.LOAD_PROGRESS, (e: any) => { buffered = e.loadedProgress ?? buffered; });
      widget.bind(E.SEEK, (e: any) => on.progress(e.currentPosition / 1000, duration, buffered));
      widget.bind(E.PAUSE, () => {
        // a pause straight after our play request, before any audio, is the browser saying no
        if (wantPlay) { wantPlay = false; on.blocked(); } else on.paused();
      });
      widget.bind(E.FINISH, () => on.ended());
      widget.bind(E.ERROR, () => on.error());
      duration = ((await get('getDuration')) || 0) / 1000;
      const sound = await get('getCurrentSound');
      const art: string | undefined = sound?.artwork_url || sound?.user?.avatar_url;
      loaded = true;
      on.ready({ duration, artwork: art?.replace(/-(large|t\d+x\d+)\./, '-t500x500.') });
    })().catch((e) => { loading = null; throw e; }));
  }

  return {
    get loaded() { return loaded; },
    controllable: true,
    load,
    play(startAt) {
      if (startAt != null) {
        if (started) widget.seekTo(startAt * 1000);
        else if (startAt > 0) pendingStart = startAt;
      }
      wantPlay = true;
      widget.play();
    },
    pause() { wantPlay = false; widget?.pause(); },
    seek(s) {
      if (!widget || !started) { pendingStart = s; return; }
      widget.seekTo(s * 1000);
    },
  };
}

/* ---------- self-hosted files: a native <audio> ---------- */
export function file(host: HTMLElement, src: string, on: Events): Adapter {
  const a = document.createElement('audio');
  a.preload = 'none';
  a.controls = true; // only seen if the browser blocks our button and the sheet shows it instead
  a.src = src;
  host.append(a);
  const buf = () => (a.duration && a.buffered.length ? a.buffered.end(a.buffered.length - 1) / a.duration : 0);
  a.addEventListener('loadedmetadata', () => on.ready({ duration: a.duration || 0 }));
  a.addEventListener('playing', () => on.started());
  a.addEventListener('timeupdate', () => on.progress(a.currentTime, a.duration || 0, buf()));
  a.addEventListener('progress', () => on.progress(a.currentTime, a.duration || 0, buf()));
  a.addEventListener('pause', () => { if (!a.ended) on.paused(); });
  a.addEventListener('ended', () => on.ended());
  a.addEventListener('error', () => on.error());
  return {
    loaded: true,
    controllable: true,
    load: () => Promise.resolve(),
    play(startAt) {
      if (startAt != null) a.currentTime = startAt;
      a.play().catch((e: DOMException) => (e.name === 'NotAllowedError' ? on.blocked() : e.name === 'AbortError' ? undefined : on.error()));
    },
    pause: () => a.pause(),
    seek(s) { a.currentTime = s; on.progress(s, a.duration || 0, buf()); },
  };
}

/* ---------- Bandcamp: no API, so its own player is shown in the sheet when asked for ---------- */
export function bandcamp(host: HTMLElement, embedUrl: string, title: string): Adapter {
  let loading: Promise<void> | null = null;
  return {
    loaded: false,
    controllable: false,
    load() {
      return (loading ??= new Promise<void>((resolve) => {
        const f = document.createElement('iframe');
        f.src = embedUrl;
        f.title = `${title} on Bandcamp`;
        f.allow = 'autoplay';
        f.onload = () => resolve();
        host.append(f);
      }));
    },
    play() {},
    pause() {},
    seek() {},
  };
}
