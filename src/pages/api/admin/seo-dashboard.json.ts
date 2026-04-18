import type { APIRoute } from 'astro';
import { ensureAdminAuthorized } from '../../../lib/adminAuth';
import { buildSeoDashboardPayload } from '../../../lib/seoDashboard';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const unauthorized = ensureAdminAuthorized(context);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = await buildSeoDashboardPayload(context);
    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify(
        {
          ok: false,
          error: (error as Error)?.message || 'Unknown dashboard error',
        },
        null,
        2,
      ),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      },
    );
  }
};
