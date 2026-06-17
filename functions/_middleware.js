/**
 * Enforce trailing slash on HTML routes (canonical URL policy).
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const { pathname } = url;

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
