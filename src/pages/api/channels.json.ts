import type { APIRoute } from 'astro';
import { fetchChannels } from '../../lib/epg';
import { getChannelGeo } from '../../utils/channelGeo';
import { getChannelStream } from '../../utils/channelStreams';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    const rawChannels = await fetchChannels();
    const channels = rawChannels.map(ch => {
      const geo = getChannelGeo(ch.id);
      const stream = getChannelStream(ch.id);
      return {
        id: ch.id,
        name: ch.name,
        number: ch.number,
        logo: ch.logo,
        type: ch.type,
        position: ch.position,
        stream: stream ? {
          url: stream.url,
          label: stream.label,
          loginRequired: stream.login_required,
          geoIt: stream.geo_it,
        } : null,
        geo: geo ? {
          city: geo.city,
          province: geo.province,
          region: geo.region,
          country: geo.country,
          coverage: geo.coverage,
          isLocal: geo.isLocal,
          badge: geo.badge,
          latitude: geo.latitude,
          longitude: geo.longitude,
        } : null,
      };
    });

    return new Response(JSON.stringify({
      success: true,
      total: channels.length,
      updatedAt: new Date().toISOString(),
      channels,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
};
