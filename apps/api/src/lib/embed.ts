/**
 * Embed URL allowlist. Every stream source ends up as an <iframe src>, so only known
 * embeddable player endpoints are accepted (https only). Extra hosts for "custom embed URLs"
 * can be added with EMBED_HOST_ALLOWLIST="player.example.com,cdn.example.org".
 */
const BUILTIN: { host: string; pathPrefix: RegExp }[] = [
  { host: "www.youtube.com", pathPrefix: /^\/embed\/[\w-]{11}/ },
  { host: "www.youtube-nocookie.com", pathPrefix: /^\/embed\/[\w-]{11}/ },
  { host: "player.vimeo.com", pathPrefix: /^\/video\/\d+/ },
  { host: "www.dailymotion.com", pathPrefix: /^\/embed\/video\/[\w]+/ },
  { host: "geo.dailymotion.com", pathPrefix: /^\/player/ },
  { host: "drive.google.com", pathPrefix: /^\/file\/d\/[\w-]+\/preview/ },
];

const extraHosts = (process.env.EMBED_HOST_ALLOWLIST ?? "")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedEmbed(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (extraHosts.includes(host)) return true;
  return BUILTIN.some((b) => b.host === host && b.pathPrefix.test(u.pathname));
}

export const allowedEmbedHosts = [...BUILTIN.map((b) => b.host), ...extraHosts];
