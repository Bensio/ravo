export function isTestOrder(row: {
  provider_order_id: string;
  metadata?: unknown;
}): boolean {
  if (row.provider_order_id.startsWith('sim-')) {
    return true;
  }
  if (!row.metadata || typeof row.metadata !== 'object') {
    return false;
  }
  const source = (row.metadata as { source?: string }).source;
  return source === 'simulate_sale';
}
