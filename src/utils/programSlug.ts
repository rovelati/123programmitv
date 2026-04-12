export const getProgramSlug = (title: string): string => {
  if (!title || typeof title !== 'string') return '';
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export const getProgramUrl = (channelSlug: string, programTitle: string): string =>
  `/programma/${channelSlug}/${getProgramSlug(programTitle)}`;

export const parseProgramUrl = (path: string): { channelSlug: string; programSlug: string } | null => {
  const match = path.match(/^\/programma\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { channelSlug: match[1], programSlug: match[2] };
};
