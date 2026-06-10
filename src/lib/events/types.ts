export type EventPhase = 'upcoming' | 'live' | 'past';

export type SerializedEvent = {
  id: string;
  name: string;
  slug: string;
  startAt: string;
  endAt: string;
  timezone: string;
  venue: string | null;
  country: string | null;
  coverImageUrl: string | null;
  currency: string;
  phase: EventPhase;
};

export type SerializedCampaignProgram = {
  id: string;
  eventId: string;
  name: string;
  slug: string;
  state: 'draft' | 'active' | 'paused' | 'closed' | 'archived';
  refundWindowDays: number;
  tier4PayoutPolicy: 'auto' | 'requires_confirmation' | 'denied';
  startsAt: string | null;
  endsAt: string | null;
};

export type SerializedEventDetail = SerializedEvent & {
  campaign: SerializedCampaignProgram | null;
  isActive: boolean;
};
