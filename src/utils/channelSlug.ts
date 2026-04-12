import type { HubChannel } from '../types';

const CHANNEL_SLUGS: Record<string, string> = {
  'rai-1': 'rai-1',
  'rai-2': 'rai-2',
  'rai-3': 'rai-3',
  'rai-4': 'rai-4',
  'rai-5': 'rai-5',
  'rai-movie': 'rai-movie',
  'rai-premium': 'rai-premium',
  'canale-5': 'canale-5',
  'italia-1': 'italia-1',
  'italia-2': 'italia-2',
  'rete-4': 'rete-4',
  'la7': 'la7',
  'la7d': 'la7d',
  'tv8': 'tv8',
  'nove': 'nove',
  '20': '20',
  'iris': 'iris',
  'warner-tv': 'warner-tv',
  'focus': 'focus',
  'giallo': 'giallo',
  'top-crime': 'top-crime',
  'cielo': 'cielo',
  'twenty-seven': 'twenty-seven',
  'real-time': 'real-time',
  'cine34': 'cine34',
  'boing': 'boing',
  'k2': 'k2',
  'frisbee': 'frisbee',
  'cartoonito': 'cartoonito',
  'tgcom24': 'tgcom24',
  'mediaset-extra': 'mediaset-extra',
  'dmax': 'dmax',
  'r101': 'r101',
  'radio-105': 'radio-105',
  'radio-rai-1': 'radio-rai-1',
  'radio-rai-2': 'radio-rai-2',
  'radio-rai-3': 'radio-rai-3',
};

export const getChannelSlug = (channelId: string): string => {
  if (!channelId || typeof channelId !== 'string') return '';
  const normalized = channelId.toLowerCase();
  return CHANNEL_SLUGS[normalized] ?? normalized.replace(/\s+/g, '-');
};

export const getHubChannelUrl = (channelId: string): string =>
  `/${getChannelSlug(channelId)}`;

/** Canali TV principali esposti come hub (nell'ordine LCN) */
export const HUB_CHANNELS: HubChannel[] = [
  { id: 'rai-1',        name: 'RAI 1',       number: 1  },
  { id: 'rai-2',        name: 'RAI 2',       number: 2  },
  { id: 'rai-3',        name: 'RAI 3',       number: 3  },
  { id: 'rete-4',       name: 'Rete 4',      number: 4  },
  { id: 'canale-5',     name: 'Canale 5',    number: 5  },
  { id: 'italia-1',     name: 'Italia 1',    number: 6  },
  { id: 'la7',          name: 'La7',         number: 7  },
  { id: 'tv8',          name: 'TV8',         number: 8  },
  { id: 'nove',         name: 'Nove',        number: 9  },
  { id: '20',           name: '20 Mediaset', number: 20 },
  { id: 'rai-4',        name: 'RAI 4',       number: 21 },
  { id: 'iris',         name: 'Iris',        number: 22 },
  { id: 'rai-5',        name: 'RAI 5',       number: 23 },
  { id: 'rai-movie',    name: 'RAI Movie',   number: 24 },
  { id: 'cielo',        name: 'Cielo',       number: 26 },
  { id: 'twenty-seven', name: '27 Twenty Seven', number: 27 },
  { id: 'la7d',         name: 'La7d',        number: 29 },
  { id: 'real-time',    name: 'Real Time',   number: 31 },
  { id: 'cine34',       name: 'Cine34',      number: 34 },
  { id: 'focus',        name: 'Focus',       number: 35 },
  { id: 'warner-tv',    name: 'Warner TV',   number: 37 },
  { id: 'giallo',       name: 'Giallo',      number: 38 },
  { id: 'top-crime',    name: 'Top Crime',   number: 39 },
  { id: 'boing',        name: 'Boing',       number: 40 },
  { id: 'k2',           name: 'K2',          number: 41 },
  { id: 'frisbee',      name: 'Frisbee',     number: 44 },
  { id: 'cartoonito',   name: 'Cartoonito',  number: 46 },
  { id: 'italia-2',     name: 'Italia 2',    number: 49 },
  { id: 'tgcom24',      name: 'TGcom24',     number: 51 },
  { id: 'dmax',         name: 'DMAX',        number: 52 },
  { id: 'mediaset-extra', name: 'Mediaset Extra', number: 55 },
];
