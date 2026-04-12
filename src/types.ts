export interface Program {
  id: string;
  title: string;
  startTime: string; // ISO format
  endTime: string;   // ISO format
  date?: string;     // YYYY-MM-DD (Europe/Rome)
  category: string;
  description: string;
  slug?: string;
  poster_url?: string | null;
  indexable?: boolean; // true solo per film con synopsis > 300 parole
  isLive?: boolean;
  channel_id?: string;
}

export interface Channel {
  id: string;
  name: string;
  number: number;
  logo: string;
  type: 'Generalista' | 'Tematico' | 'Film' | 'Sport' | 'News' | 'Radio';
  programs: Program[];
  color?: string;
  isRadio?: boolean;
  streamUrl?: string;
  website?: string;
  visible?: boolean;
  position?: number;
  source?: string;
}

export type TimeSlotFilter = 'Tutti' | 'Film' | 'Tg' | 'Documentario' | 'Show' | 'Serie TV' | 'Sport' | 'Bambini' | 'Arte';
export type ChannelViewMode = 'oggi' | 'ora' | 'stasera';

export interface HubChannel {
  id: string;
  name: string;
  number?: number;
}
