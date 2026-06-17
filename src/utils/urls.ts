export const SITE_ORIGIN = 'https://123programmitv.it';

/** Path canonico con slash iniziale e finale (root resta `/`). */
export function toCanonicalPath(path: string): string {
  if (!path || path === '/') return '/';
  let normalized = path.startsWith('/') ? path : `/${path}`;
  if (!normalized.endsWith('/')) normalized += '/';
  return normalized;
}

/** URL assoluto canonico (es. https://123programmitv.it/rai-movie/). */
export function absoluteUrl(path: string, origin = SITE_ORIGIN): string {
  return `${origin.replace(/\/$/, '')}${toCanonicalPath(path)}`;
}

/** Link interno con trailing slash (es. `/rai-movie/`). */
export function sitePath(path: string): string {
  return toCanonicalPath(path);
}
