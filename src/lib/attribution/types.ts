export type AttributionSignal =
  | 'native_tracker'
  | 'ref_param'
  | 'cookie_email_hash'
  | 'utm_window';

export type ResolvedAttribution = {
  tier: 1 | 2 | 3 | 4;
  confidence: number;
  signal: AttributionSignal;
  linkId: string;
  clickId: string | null;
  visitorId: string | null;
  ambassadorId: string;
  campaignId: string;
};

export type AttributionHint = {
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
