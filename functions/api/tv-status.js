/**
 * Cloudflare Pages Function — /api/tv-status
 * Server-side proxy for real-time TV applications health check & database status on Contabo VPS.
 */

const ADMIN_EMAIL = 'romolo.velati@gmail.com';
const ADMIN_PASS = 'Abramo*86M';
const BACKEND_URL = 'https://programmecesoir.fr/api/tv-health/api/tv-status';

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const authHeader = request.headers.get('Authorization') || '';

  let authorized = false;

  if (token === `${ADMIN_EMAIL}:${ADMIN_PASS}`) {
    authorized = true;
  } else if (authHeader.startsWith('Basic ')) {
    try {
      const base64 = authHeader.split(' ')[1];
      const decoded = atob(base64);
      const [u, p] = decoded.split(':');
      if (u === ADMIN_EMAIL && p === ADMIN_PASS) {
        authorized = true;
      }
    } catch {
      authorized = false;
    }
  }

  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'WWW-Authenticate': 'Basic realm="TV Mission Control"',
      },
    });
  }

  try {
    const backendRes = await fetch(`${BACKEND_URL}?token=${encodeURIComponent(`${ADMIN_EMAIL}:${ADMIN_PASS}`)}`, {
      headers: {
        'User-Agent': 'Cloudflare-Pages-TV-Health/1.0',
        'Cache-Control': 'no-cache',
      },
    });

    const data = await backendRes.text();

    return new Response(data, {
      status: backendRes.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: `Backend proxy failure: ${err.message}` }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
