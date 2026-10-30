// Shared by the player bar and the /tracks archive.
export const platformName = { soundcloud: 'SoundCloud', bandcamp: 'Bandcamp', spotify: 'Spotify', youtube: 'YouTube', file: 'STRUKT' } as const;

// Height of each platform's embed in px. Bandcamp's small player fits inside the bar; taller ones open in a panel above it.
// YouTube is 0: it is sized at 16:9 instead.
export const embedHeight = { soundcloud: 166, bandcamp: 42, spotify: 80, youtube: 0, file: 0 } as const;
