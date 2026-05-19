import { z } from 'zod';

export const TellerTransactionSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  amount: z.string(),
  date: z.string(),
  description: z.string(),
  details: z
    .object({
      category: z.string().nullable().optional(),
      counterparty: z
        .object({
          name: z.string().optional(),
          type: z.string().optional(),
        })
        .optional(),
      processing_status: z.string().optional(),
    })
    .optional(),
  running_balance: z.string().nullable().optional(),
  status: z.enum(['pending', 'posted']),
  type: z.enum(['card_payment', 'ach', 'wire', 'transfer', 'digital_payment', 'other', 'atm', 'fee', 'adjustment', 'interest', 'paycheck', 'disbursement', 'deposit', 'withdrawal']),
});

export type TellerTransaction = z.infer<typeof TellerTransactionSchema>;

export const TellerWebhookPayloadSchema = z.object({
  id: z.string(),
  type: z.enum([
    'transactions.processed',
    'enrollment.disconnected',
    'account.number_verification.processed',
    'webhook.test',
  ]),
  payload: z
    .object({
      account_id: z.string().optional(),
      enrollment_id: z.string().optional(),
      transactions: z.array(TellerTransactionSchema).optional(),
      reason: z.string().optional(),
    })
    .optional(),
});

export type TellerWebhookPayload = z.infer<typeof TellerWebhookPayloadSchema>;
