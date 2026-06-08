import { describe, expect, it } from 'vitest';
import { buildDestinationUrl } from '@/lib/links/redirect';

describe('buildDestinationUrl', () => {
  const baseLink = {
    link_id: '00000000-0000-4000-8000-000000000001',
    organization_id: '00000000-0000-4000-8000-000000000002',
    campaign_id: '00000000-0000-4000-8000-000000000003',
    ambassador_id: '00000000-0000-4000-8000-000000000004',
    destination_url: 'https://shop.example.com/tickets',
    disabled: false,
    label: 'instagram',
    campaign_slug: 'summer-26',
    ambassador_slug: 'dj-max',
  };

  it('appends UTM params and ref', () => {
    const url = buildDestinationUrl(baseLink, 'click-uuid');
    expect(url.searchParams.get('ref')).toBe('click-uuid');
    expect(url.searchParams.get('utm_source')).toBe('ravo');
    expect(url.searchParams.get('utm_campaign')).toBe('summer-26');
    expect(url.searchParams.get('utm_term')).toBe('instagram');
  });

  it('appends native tracker param when present', () => {
    const url = buildDestinationUrl(
      { ...baseLink, provider_tracker_id: 'wt-tracker-99' },
      'click-uuid',
    );
    expect(url.searchParams.get('tracker')).toBe('wt-tracker-99');
  });
});
