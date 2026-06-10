/** URL-safe slug for events and derived campaign slugs. */
export function slugifyEventName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return base.length > 0 ? base : 'festival';
}

export function campaignSlugForEvent(eventSlug: string): string {
  const suffix = '-program';
  const max = 64 - suffix.length;
  return `${eventSlug.slice(0, max)}${suffix}`;
}
