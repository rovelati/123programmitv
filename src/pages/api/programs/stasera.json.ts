import type { APIRoute } from 'astro';
import { fetchChannels, fetchProgramsForDate } from '../../../lib/epg';
import { getTodayInRome, filterStaseraPrograms, formatTime } from '../../../utils/timeSlots';
import { getChannelStream } from '../../../utils/channelStreams';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    const today = getTodayInRome();
    const [channels, allPrograms] = await Promise.all([
      fetchChannels(),
      fetchProgramsForDate(today),
    ]);

    const programsByChannel = new Map<string, typeof allPrograms>();
    for (const prog of allPrograms) {
      const list = programsByChannel.get(prog.channel_id ?? '') ?? [];
      list.push(prog);
      programsByChannel.set(prog.channel_id ?? '', list);
    }

    const channelMap = new Map(channels.map(c => [c.id, c]));

    const schedule = channels.map(channel => {
      const chPrograms = programsByChannel.get(channel.id) ?? [];
      const stasera = filterStaseraPrograms(chPrograms);
      const stream = getChannelStream(channel.id);

      return {
        channel: {
          id: channel.id,
          name: channel.name,
          number: channel.number,
          logo: channel.logo,
          streamUrl: stream?.url ?? null,
          streamLabel: stream?.label ?? null,
        },
        programs: stasera.map((p, idx) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          category: p.category,
          startTime: p.startTime,
          endTime: p.endTime,
          startTimeFormatted: formatTime(p.startTime),
          endTimeFormatted: formatTime(p.endTime),
          posterUrl: p.poster_url,
          isPrimaSerata: idx === 0,
          isSecondaSerata: idx === 1,
        })),
      };
    }).filter(entry => entry.programs.length > 0);

    return new Response(JSON.stringify({
      success: true,
      date: today,
      updatedAt: new Date().toISOString(),
      channelsCount: schedule.length,
      schedule,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
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
