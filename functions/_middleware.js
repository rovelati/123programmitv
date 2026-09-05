/**
 * Enforce trailing slash on HTML routes (canonical URL policy).
 */
const CANONICAL_HOST = 'www.intvstasera.it';
const REDIRECT_HOSTS = new Set([
  '123programmitv.it',
  'www.123programmitv.it',
  'intvstasera.it',
]);

const LEGACY_CHANNEL_PATH =
  /^\/(?:programmi-tv|palinsesto)\/([^/]+)\/(stasera|domani|ora)\/?$/;

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (REDIRECT_HOSTS.has(url.hostname)) {
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }

  const { pathname } = url;

  const legacyMatch = pathname.match(LEGACY_CHANNEL_PATH);
  if (legacyMatch) {
    const [, canale, slot] = legacyMatch;
    if (slot === 'stasera') {
      url.pathname = `/${canale}/`;
      return Response.redirect(url.toString(), 301);
    }
    if (slot === 'domani') {
      url.pathname = `/${canale}/domani/`;
      return Response.redirect(url.toString(), 301);
    }
    if (slot === 'ora') {
      url.pathname = '/';
      return Response.redirect(url.toString(), 301);
    }
  }

  if (
    pathname === '/'
    || pathname.endsWith('/')
    || pathname.includes('.')
    || pathname.startsWith('/_astro/')
    || pathname.startsWith('/images/')
    || pathname.startsWith('/favicon/')
    || pathname.startsWith('/og/')
    || pathname.startsWith('/search-console/')
  ) {
    return context.next();
  }

  url.pathname = `${pathname}/`;
  return Response.redirect(url.toString(), 301);
}
