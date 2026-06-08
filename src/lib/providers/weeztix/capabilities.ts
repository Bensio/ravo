import type { ProviderCapabilities } from '../types';

export const WEEZTIX_CAPABILITIES: ProviderCapabilities = {
  nativeTrackers: true,
  webhooks: true,
  refundEvents: false,
  refundInferenceField: 'invalidated_since',
  orderLookup: true,
  promoCodes: false,
  reconciliation: true,
  authenticity: { kind: 'nonce', header: 'OpenTicket-Identifier' },
  providerSuppliedIdempotencyHeader: 'OpenTicket-Dedupe-Key',
  retryStatusCode: 400,
};
