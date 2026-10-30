// The player's single source of truth. Every part of the UI renders from this state; nothing keeps its own copy.
export type Status = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export interface State {
  status: Status;
  /** seconds */
  position: number;
  /** seconds, 0 until the platform reports it */
  duration: number;
  /** 0 to 1 */
  buffered: number;
  /** seconds, while a scrubber is being dragged */
  scrub: number | null;
  view: 'open' | 'collapsed';
  sheet: boolean;
  panel: boolean;
  /** the platform's own player is on show in the sheet, because the browser blocked ours (or it's Bandcamp) */
  embed: boolean;
  /** the browser blocked playback from our button */
  blocked: boolean;
  artwork: string;
  /** first visit and nothing played yet: the artist line reads "Tap to play" */
  hint: boolean;
  /** phones: the on-screen keyboard is open */
  keyboard: boolean;
  /** the bar would sit over a send button or call to action */
  duck: boolean;
}

export type Listener = (s: State, prev: State) => void;

export function createStore(initial: State) {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set(patch: Partial<State>) {
      const prev = state;
      const next = { ...state, ...patch };
      if ((Object.keys(patch) as (keyof State)[]).every((k) => prev[k] === next[k])) return;
      state = next;
      listeners.forEach((l) => l(state, prev));
    },
    subscribe(l: Listener) {
      listeners.add(l);
      l(state, state);
    },
  };
}
