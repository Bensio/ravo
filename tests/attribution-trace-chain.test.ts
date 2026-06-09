import { describe, expect, it } from 'vitest';
import { buildAttributionChain, signalLabel } from '@/lib/attribution/trace-chain';

describe('buildAttributionChain', () => {
  it('builds a full tier-2 chain', () => {
    const chain = buildAttributionChain({
      refParam: 'click-uuid',
      clickAt: '2026-06-01T12:00:00Z',
      clickDevice: 'mobile',
      clickCountry: 'NL',
      linkCode: 'abc123',
      ambassadorHandle: 'owner',
      tier: 2,
      signal: 'ref_param',
      confidence: 0.95,
      state: 'active',
    });

    expect(chain.map((s) => s.key)).toEqual([
      'ref',
      'click',
      'link',
      'ambassador',
      'resolution',
    ]);
    expect(chain[4]?.label).toContain('Tier 2');
    expect(chain[4]?.detail).toBe('95% confidence');
  });

  it('marks invalidated and manual states', () => {
    const invalidated = buildAttributionChain({
      refParam: null,
      clickAt: null,
      clickDevice: null,
      clickCountry: null,
      linkCode: 'x',
      ambassadorHandle: 'a',
      tier: 2,
      signal: 'ref_param',
      confidence: 0.95,
      state: 'invalidated',
    });
    expect(invalidated.some((s) => s.key === 'invalidated')).toBe(true);

    const manual = buildAttributionChain({
      refParam: null,
      clickAt: null,
      clickDevice: null,
      clickCountry: null,
      linkCode: 'x',
      ambassadorHandle: 'a',
      tier: 4,
      signal: 'utm_window',
      confidence: 1,
      state: 'manually_assigned',
    });
    expect(manual.some((s) => s.key === 'manual')).toBe(true);
  });
});

describe('signalLabel', () => {
  it('maps known signals', () => {
    expect(signalLabel('ref_param')).toBe('Click ref parameter');
    expect(signalLabel('unknown')).toBe('unknown');
  });
});
