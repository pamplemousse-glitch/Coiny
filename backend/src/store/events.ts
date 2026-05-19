// Idempotency store — deduplicates Teller webhook events by payload ID.
// Teller retries unacknowledged webhooks; without this the same transaction
// would fire multiple reactions.

const processedIds = new Set<string>();
const MAX_IDS = 10_000;

export function isAlreadyProcessed(id: string): boolean {
  return processedIds.has(id);
}

export function markProcessed(id: string): void {
  if (processedIds.size >= MAX_IDS) {
    const oldest = processedIds.values().next().value as string;
    processedIds.delete(oldest);
  }
  processedIds.add(id);
}
