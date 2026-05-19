// Score deltas per event type. Applied after each matching rule fires.
// Positive = financially healthy behaviour. Negative = risky/overspent.
const DELTAS: Record<string, number> = {
  paycheck_received: 10,
  bill_paid_on_time: 5,
  savings_milestone: 15,
  overspent_in_category: -10,
  large_purchase: -5,
};

export function deltaForEvent(eventType: string): number {
  return DELTAS[eventType] ?? 0;
}
