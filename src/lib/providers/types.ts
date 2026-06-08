export type ProviderId =
  | 'weeztix'
  | 'manual_utm'
  | 'eventbrite'
  | 'eventix'
  | 'shopify'
  | 'stripe';

export type OrderStatus = 'pending' | 'paid' | 'partially_refunded' | 'refunded' | 'cancelled';

export type AuthenticityMechanism =
  | { kind: 'hmac'; algorithm: 'sha256'; header: string; encoding: 'hex' | 'base64' }
  | { kind: 'nonce'; header: string }
  | { kind: 'none' };

export interface ProviderCapabilities {
  nativeTrackers: boolean;
  webhooks: boolean;
  refundEvents: boolean;
  refundInferenceField?: string;
  orderLookup: boolean;
  promoCodes: boolean;
  reconciliation: boolean;
  authenticity: AuthenticityMechanism;
  providerSuppliedIdempotencyHeader?: string;
  retryStatusCode: 400 | 503;
}

export interface NormalizedLineItem {
  providerItemId?: string;
  ticketType: string;
  quantity: number;
  unitAmountCents: bigint;
  currency: string;
}

export interface NormalizedOrderEvent {
  provider: ProviderId;
  externalOrderId: string;
  externalShopId: string;
  externalEventId?: string;
  status: OrderStatus;
  currency: string;
  grossAmountCents: bigint;
  netAmountCents: bigint;
  lineItems: NormalizedLineItem[];
  buyerEmailHash: string | null;
  buyerCountry?: string;
  placedAt: string;
  paidAt?: string | null;
  occurredAt: string;
  attributionHint?: {
    trackerExternalId?: string;
    refParam?: string;
    utm?: {
      source?: string;
      medium?: string;
      campaign?: string;
      content?: string;
      term?: string;
    };
  };
  rawMetadata?: Record<string, unknown>;
}

export interface TicketingProvider {
  id: ProviderId;
  capabilities: ProviderCapabilities;
  verifyWebhookAuthenticity?(args: {
    rawBody: string;
    headers: Headers;
    storedSecret: string;
  }): boolean;
  parseWebhook?(args: { rawBody: string; headers: Headers }): NormalizedOrderEvent | null;
  deriveIdempotencyKey?(args: {
    rawBody: string;
    headers: Headers;
    parsed?: NormalizedOrderEvent | null;
  }): string | null;
}
