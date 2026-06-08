export type DashboardAmbassadorRow = {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  clicks: number;
  sales: number;
  revenueCents: bigint;
  conversion: number;
  spark: number[];
};

export type DashboardTrendPoint = {
  day: string;
  clicks: number;
  sales: number;
  revenueCents: bigint;
};

export type OrgDashboardData = {
  rows: DashboardAmbassadorRow[];
  series: DashboardTrendPoint[];
  totals: {
    clicks: number;
    sales: number;
    revenueCents: bigint;
    conversion: number;
  };
  deltas: {
    clicks: number | null;
    sales: number | null;
    revenue: number | null;
    conversion: number | null;
  };
  currency: string;
  timezone: string;
};

/** JSON-safe shape for client components (bigint → string). */
export type SerializedOrgDashboard = {
  rows: Array<Omit<DashboardAmbassadorRow, 'revenueCents'> & { revenueCents: string }>;
  series: Array<Omit<DashboardTrendPoint, 'revenueCents'> & { revenueCents: string }>;
  totals: {
    clicks: number;
    sales: number;
    revenueCents: string;
    conversion: number;
  };
  deltas: OrgDashboardData['deltas'];
  currency: string;
  timezone: string;
};

export function serializeOrgDashboard(data: OrgDashboardData): SerializedOrgDashboard {
  return {
    rows: data.rows.map((r) => ({ ...r, revenueCents: r.revenueCents.toString() })),
    series: data.series.map((s) => ({ ...s, revenueCents: s.revenueCents.toString() })),
    totals: { ...data.totals, revenueCents: data.totals.revenueCents.toString() },
    deltas: data.deltas,
    currency: data.currency,
    timezone: data.timezone,
  };
}
