import { describe, expect, it } from 'vitest';
import { campaignSlugForEvent, slugifyEventName } from './slug';

describe('slugifyEventName', () => {
  it('slugifies festival names', () => {
    expect(slugifyEventName('Sun Splash 2026')).toBe('sun-splash-2026');
    expect(slugifyEventName('  ')).toBe('festival');
  });
});

describe('campaignSlugForEvent', () => {
  it('appends program suffix', () => {
    expect(campaignSlugForEvent('sun-splash-2026')).toBe('sun-splash-2026-program');
  });
});
