const TEST_ORDER_ID_PREFIXES = ['sim-', 'test-'] as const;

const TEST_METADATA_SOURCES = new Set(['simulate_sale', 'manual_utm_test']);

export function isTestOrder(row: {
  provider_order_id: string;
  metadata?: unknown;
}): boolean {
  const id = row.provider_order_id;
  if (TEST_ORDER_ID_PREFIXES.some((prefix) => id.startsWith(prefix))) {
    return true;
  }
  if (!row.metadata || typeof row.metadata !== 'object') {
    return false;
  }
  const source = (row.metadata as { source?: string }).source;
  return typeof source === 'string' && TEST_METADATA_SOURCES.has(source);
}
