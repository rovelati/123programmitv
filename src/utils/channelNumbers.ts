const CHANNEL_NUMBER_MAP: Record<string, number> = {
  'rai-1': 1, 'rai-2': 2, 'rai-3': 3, 'rete-4': 4, 'canale-5': 5,
  'italia-1': 6, 'la7': 7, 'tv8': 8, 'nove': 9, '20': 20,
  'rai-4': 21, 'iris': 22, 'rai-5': 23, 'rai-movie': 24, 'cielo': 26,
  'twenty-seven': 27, 'la7d': 29, 'la-5': 30, 'real-time': 31,
  'cine34': 34, 'focus': 35, 'warner-tv': 37, 'giallo': 38,
  'top-crime': 39, 'boing': 40, 'k2': 41, 'frisbee': 44,
  'cartoonito': 46, 'italia-2': 49, 'tgcom24': 51, 'dmax': 52,
  'mediaset-extra': 55, 'r101': 101, 'radio-105': 105,
};

const CHANNEL_NAME_MAP: Record<string, number> = {
  'rai 1': 1, 'rai 2': 2, 'rai 3': 3, 'rete 4': 4, 'canale 5': 5,
  'italia 1': 6, 'la7': 7, 'tv8': 8, 'nove': 9, 'mediaset 20': 20,
  'rai 4': 21, 'iris': 22, 'rai 5': 23, 'rai movie': 24, 'cielo': 26,
  'twenty seven': 27, 'la7d': 29, 'la 5': 30, 'real time': 31,
  'cine34': 34, 'focus': 35, 'warner tv': 37, 'giallo': 38,
  'top crime': 39, 'boing': 40, 'k2': 41, 'frisbee': 44,
  'cartoonito': 46, 'italia 2': 49, 'tgcom 24': 51, 'dmax': 52,
  'mediaset extra': 55, 'radio 101': 101, 'radio 105': 105,
};

const normalizeKey = (value: unknown): string =>
  String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const findMappedNumber = (channelId?: unknown, channelName?: unknown): number | null => {
  const idKey = normalizeKey(channelId);
  if (idKey) {
    for (const [slug, mapped] of Object.entries(CHANNEL_NUMBER_MAP)) {
      if (normalizeKey(slug) === idKey) return mapped;
    }
  }
  const nameKey = normalizeKey(channelName);
  if (nameKey) {
    for (const [name, mapped] of Object.entries(CHANNEL_NAME_MAP)) {
      if (normalizeKey(name) === nameKey) return mapped;
    }
  }
  return null;
};

export const resolveChannelNumber = (rawNumber: unknown, channelId?: unknown, channelName?: unknown): number => {
  const parsed = Number(rawNumber);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return findMappedNumber(channelId, channelName) ?? 0;
};

export const getChannelNumberLabel = (rawNumber: unknown): string => {
  const parsed = Number(rawNumber);
  if (!Number.isFinite(parsed) || parsed <= 0) return '--';
  return String(parsed);
};
