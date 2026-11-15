export function idVideoYoutube(url: string | null): string | null {
  if (!url) return null;
  return /^https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})$/.exec(url)?.[1] ?? null;
}
