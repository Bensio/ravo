import type { AttributionSignal } from './types';

export type TraceStep = {
  key: string;
  label: string;
  detail: string | null;
};

const SIGNAL_LABELS: Record<AttributionSignal, string> = {
  native_tracker: 'Native provider tracker',
  ref_param: 'Click ref parameter',
  cookie_email_hash: 'Visitor cookie + email hash',
  utm_window: 'UTM match within 7-day window',
};

export function signalLabel(signal: string): string {
  return SIGNAL_LABELS[signal as AttributionSignal] ?? signal;
}

export function buildAttributionChain(input: {
  refParam: string | null;
  clickAt: string | null;
  clickDevice: string | null;
  clickCountry: string | null;
  linkCode: string | null;
  ambassadorHandle: string | null;
  tier: number | null;
  signal: string | null;
  confidence: number | null;
  state: string | null;
}): TraceStep[] {
  const steps: TraceStep[] = [];

  if (input.refParam) {
    steps.push({
      key: 'ref',
      label: 'Ref captured on order',
      detail: input.refParam,
    });
  }

  if (input.clickAt) {
    const parts = [input.clickAt];
    if (input.clickDevice) parts.push(input.clickDevice);
    if (input.clickCountry) parts.push(input.clickCountry);
    steps.push({
      key: 'click',
      label: 'Matching click',
      detail: parts.join(' · '),
    });
  }

  if (input.linkCode) {
    steps.push({
      key: 'link',
      label: 'Tracklink',
      detail: input.linkCode,
    });
  }

  if (input.ambassadorHandle) {
    steps.push({
      key: 'ambassador',
      label: 'Ambassador',
      detail: `@${input.ambassadorHandle}`,
    });
  }

  if (input.tier !== null && input.signal) {
    const confidence =
      input.confidence !== null ? `${Math.round(input.confidence * 100)}% confidence` : null;
    steps.push({
      key: 'resolution',
      label: `Tier ${input.tier} · ${signalLabel(input.signal)}`,
      detail: confidence,
    });
  }

  if (input.state === 'invalidated') {
    steps.push({
      key: 'invalidated',
      label: 'Attribution invalidated',
      detail: null,
    });
  }

  if (input.state === 'manually_assigned') {
    steps.push({
      key: 'manual',
      label: 'Manually assigned by admin',
      detail: null,
    });
  }

  return steps;
}
