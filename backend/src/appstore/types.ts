import { z } from 'zod';

// Product identifiers. These are the single source of truth for the backend
// and must match ios/Coiny/Coiny.storekit today and App Store Connect when the
// real products are created (blocked on the Athanor Works LLC org enrollment,
// R-27.1). Pricing per docs/prd.md §25.1 (DR-2) and both billing periods per
// DR-24, annual presented first.
export const PRODUCT_IDS = {
  individualAnnual: 'app.coiny.individual.annual',
  individualMonthly: 'app.coiny.individual.monthly',
  householdAnnual: 'app.coiny.household.annual',
  householdMonthly: 'app.coiny.household.monthly',
} as const;

export type PaidTier = 'individual' | 'household';
export type Tier = 'free' | PaidTier;

export function tierForProductId(productId: string): PaidTier | null {
  if (productId === PRODUCT_IDS.individualAnnual || productId === PRODUCT_IDS.individualMonthly) {
    return 'individual';
  }
  if (productId === PRODUCT_IDS.householdAnnual || productId === PRODUCT_IDS.householdMonthly) {
    return 'household';
  }
  return null;
}

// --- Decoded JWS payload schemas -------------------------------------------
// Shapes from App Store Server API / Server Notifications V2 documentation.
// Only the fields we consume are declared; unknown fields pass through Zod
// untouched. All of these arrive from a VERIFIED Apple JWS, but they are still
// external input and get schema-validated per the security rules.

export const transactionPayloadSchema = z.object({
  transactionId: z.string(),
  originalTransactionId: z.string(),
  productId: z.string(),
  bundleId: z.string(),
  environment: z.enum(['Sandbox', 'Production', 'Xcode', 'LocalTesting']),
  type: z.string().optional(),
  purchaseDate: z.number().optional(),
  expiresDate: z.number().optional(),
  appAccountToken: z.string().optional(),
  revocationDate: z.number().optional(),
  revocationReason: z.number().optional(),
});
export type TransactionPayload = z.infer<typeof transactionPayloadSchema>;

export const renewalInfoPayloadSchema = z.object({
  originalTransactionId: z.string().optional(),
  autoRenewProductId: z.string().optional(),
  autoRenewStatus: z.number().optional(), // 1 = will renew, 0 = turned off
  expirationIntent: z.number().optional(),
  gracePeriodExpiresDate: z.number().optional(),
  isInBillingRetryPeriod: z.boolean().optional(),
  environment: z.enum(['Sandbox', 'Production', 'Xcode', 'LocalTesting']).optional(),
});
export type RenewalInfoPayload = z.infer<typeof renewalInfoPayloadSchema>;

export const notificationPayloadSchema = z.object({
  notificationType: z.string(),
  subtype: z.string().optional(),
  notificationUUID: z.string(),
  signedDate: z.number().optional(),
  data: z
    .object({
      environment: z.enum(['Sandbox', 'Production', 'Xcode', 'LocalTesting']).optional(),
      bundleId: z.string().optional(),
      signedTransactionInfo: z.string().optional(),
      signedRenewalInfo: z.string().optional(),
    })
    .optional(),
});
export type NotificationPayload = z.infer<typeof notificationPayloadSchema>;
