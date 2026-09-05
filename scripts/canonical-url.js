/** Canonical URL helpers shared by notify-indexing, notify-websub, etc. */
export const SITE_ORIGIN = 'https://www.intvstasera.it';

export function toCanonicalPath(path) {
  if (!path || path === '/') return '/';
  let normalized = path.startsWith('/') ? path : `/${path}`;
  if (!normalized.endsWith('/')) normalized += '/';
  return normalized;
}

export function absoluteUrl(path, origin = (process.env.SITE_URL || SITE_ORIGIN).replace(/\/$/, '')) {
  return `${origin}${toCanonicalPath(path)}`;
}
