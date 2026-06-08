import type { TicketingProvider } from '../types';
import { WEEZTIX_CAPABILITIES } from './capabilities';
import {
  deriveWeeztixIdempotencyKey,
  parseWeeztixWebhook,
  verifyWeeztixNonce,
} from './parse-webhook';

export const weeztixProvider: TicketingProvider = {
  id: 'weeztix',
  capabilities: WEEZTIX_CAPABILITIES,
  verifyWebhookAuthenticity({ headers, storedSecret }) {
    const provided = headers.get('openticket-identifier');
    if (!provided) return false;
    return verifyWeeztixNonce(provided, storedSecret);
  },
  parseWebhook({ rawBody, headers }) {
    return parseWeeztixWebhook(rawBody, headers);
  },
  deriveIdempotencyKey({ headers }) {
    return deriveWeeztixIdempotencyKey(headers);
  },
};
