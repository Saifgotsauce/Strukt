// Shared by the player and the /tracks archive.
export const platformName = { soundcloud: 'SoundCloud', bandcamp: 'Bandcamp', spotify: 'Spotify', youtube: 'YouTube', file: 'STRUKT' } as const;

// The words on a track's buy link: "Buy on Bandcamp" for Bandcamp, plainer for anywhere else.
export const buyLabel = (url: string) => (/(^|\.)bandcamp\.com$/.test(new URL(url).hostname) ? 'Buy on Bandcamp' : 'Buy the track');
