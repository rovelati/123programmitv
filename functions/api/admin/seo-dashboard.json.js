import { ensureAdminAuthorized } from '../../../src/lib/adminAuth.ts';
import { buildSeoDashboardPayload } from '../../../src/lib/seoDashboard.ts';

export async function onRequestGet(context) {
  const astroLikeContext = {
    request: context.request,
    locals: {
      runtime: {
        env: context.env || {},
      },
    },
  };

  const unauthorized = ensureAdminAuthorized(astroLikeContext);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = await buildSeoDashboardPayload(astroLikeContext);
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
          error: error?.message || 'Unknown dashboard error',
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
}
