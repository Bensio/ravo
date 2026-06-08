import type { ProviderId, TicketingProvider } from './types';
import { weeztixProvider } from './weeztix';

const providers: Record<ProviderId, TicketingProvider> = {
  weeztix: weeztixProvider,
  manual_utm: {
    id: 'manual_utm',
    capabilities: {
      nativeTrackers: false,
      webhooks: false,
      refundEvents: false,
      orderLookup: false,
      promoCodes: false,
      reconciliation: false,
      authenticity: { kind: 'none' },
      retryStatusCode: 503,
    },
  },
  eventbrite: {
    id: 'eventbrite',
    capabilities: {
      nativeTrackers: false,
      webhooks: false,
      refundEvents: false,
      orderLookup: false,
      promoCodes: false,
      reconciliation: false,
      authenticity: { kind: 'hmac', algorithm: 'sha256', header: 'X-Eventbrite-Signature', encoding: 'hex' },
      retryStatusCode: 503,
    },
  },
  eventix: {
    id: 'eventix',
    capabilities: {
      nativeTrackers: false,
      webhooks: false,
      refundEvents: false,
      orderLookup: false,
      promoCodes: false,
      reconciliation: false,
      authenticity: { kind: 'none' },
      retryStatusCode: 503,
    },
  },
  shopify: {
    id: 'shopify',
    capabilities: {
      nativeTrackers: false,
      webhooks: false,
      refundEvents: false,
      orderLookup: false,
      promoCodes: false,
      reconciliation: false,
      authenticity: { kind: 'hmac', algorithm: 'sha256', header: 'X-Shopify-Hmac-Sha256', encoding: 'base64' },
      retryStatusCode: 503,
    },
  },
  stripe: {
    id: 'stripe',
    capabilities: {
      nativeTrackers: false,
      webhooks: false,
      refundEvents: false,
      orderLookup: false,
      promoCodes: false,
      reconciliation: false,
      authenticity: { kind: 'hmac', algorithm: 'sha256', header: 'Stripe-Signature', encoding: 'hex' },
      retryStatusCode: 503,
    },
  },
};

export function getProvider(id: ProviderId): TicketingProvider {
  return providers[id];
}
