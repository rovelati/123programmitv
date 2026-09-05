import type { APIContext } from 'astro';

const ADMIN_USER = 'bruno';
const ADMIN_PASS = 'baumicio';

function expectedToken(): string {
  return Buffer.from(`${ADMIN_USER}:${ADMIN_PASS}`).toString('base64');
}

export function isAdminAuthorized(request: Request): boolean {
  const headerToken = request.headers.get('x-admin-auth')?.trim();
  if (headerToken && headerToken === expectedToken()) {
    return true;
  }

  const authHeader = request.headers.get('authorization')?.trim();
  if (!authHeader?.toLowerCase().startsWith('basic ')) {
    return false;
  }

  return authHeader.slice(6).trim() === expectedToken();
}

export function ensureAdminAuthorized(context: APIContext): Response | null {
  if (isAdminAuthorized(context.request)) {
    return null;
  }

  return new Response(
    JSON.stringify({
      ok: false,
      error: 'Unauthorized',
      detail: 'Missing or invalid admin credentials.',
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'WWW-Authenticate': 'Basic realm="InTVStasera admin"',
      },
    },
  );
}
