import { describe, expect, it } from 'vitest';
import { isOrderEventScopeActive } from '@/lib/orders/order-event-scope';

describe('order-event-scope', () => {
  it('is active when event or campaigns are set', () => {
    expect(isOrderEventScopeActive({ eventId: 'evt-1', campaignIds: null })).toBe(true);
    expect(isOrderEventScopeActive({ eventId: null, campaignIds: ['c1'] })).toBe(true);
    expect(isOrderEventScopeActive({ eventId: null, campaignIds: [] })).toBe(false);
    expect(isOrderEventScopeActive({ eventId: null, campaignIds: null })).toBe(false);
  });
});
