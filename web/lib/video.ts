// Turns a YouTube or Loom share link into an embeddable player URL; anything else yields null.
export function videoEmbed(url: string | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  let youtubeId: string | null = null;
  if (host === "youtu.be") youtubeId = u.pathname.slice(1);
  else if (host.endsWith("youtube.com")) {
    youtubeId = u.searchParams.get("v") ?? u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]+)/)?.[1] ?? null;
  }
  if (youtubeId && /^[\w-]{6,20}$/.test(youtubeId)) return `https://www.youtube-nocookie.com/embed/${youtubeId}`;
  if (host.endsWith("loom.com")) {
    const loomId = u.pathname.match(/\/(?:share|embed)\/([0-9a-f]{16,})/)?.[1];
    if (loomId) return `https://www.loom.com/embed/${loomId}`;
  }
  return null;
}
