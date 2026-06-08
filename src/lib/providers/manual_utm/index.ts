import type { TicketingProvider } from '@/lib/providers/types';
import {
  deriveManualUtmIdempotencyKey,
  parseManualUtmPixel,
} from './parse-pixel';

export const manualUtmProvider: TicketingProvider = {
  id: 'manual_utm',
  capabilities: {
    nativeTrackers: false,
    webhooks: true,
    refundEvents: false,
    orderLookup: false,
    promoCodes: false,
    reconciliation: false,
    authenticity: { kind: 'none' },
    retryStatusCode: 503,
  },
  parseWebhook: ({ rawBody }) => parseManualUtmPixel(rawBody),
  deriveIdempotencyKey: ({ parsed }) => {
    if (!parsed || parsed.provider !== 'manual_utm') {
      return null;
    }
    return `manual_utm:${parsed.externalOrderId}`;
  },
};

export { parseManualUtmPixel, deriveManualUtmIdempotencyKey };
