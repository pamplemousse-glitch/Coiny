# Restoring the database

Closes G1.26 in `docs/prelaunch-verification/07-runbook.md` (audit rows 4.12.5,
4.12.6, 4.12.7, 4.12.10 and 1.11.7).

**Rehearse this on `staging` before production holds data.** Both Neon branches
currently hold synthetic data, so a drill costs nothing today. After production
exists, the first restore you ever perform is the one during an incident.

## What Neon's restore actually does

It is not a copy-back. Neon builds a new branch by matching your timestamp to
the corresponding LSN, moves the compute onto it, and renames the previous head
to `{branch}_old_{timestamp}`.

Two consequences that shape everything below:

- **The connection string does not change.** No Fly secret is touched, and the
  app does not need redeploying.
- **The old head survives under a new name.** A restore to the wrong timestamp
  is itself recoverable, so the drill is safe to get wrong.

The absence of any `_old_` branch in the project is how the audit established
that no restore had ever been performed here.

## The one thing a restore cannot recover

**The database and the encryption key are two separate stores, and recovering
one without the other recovers nothing.**

Every Plaid `access_token` and every encrypted PII column is AES-256-GCM
ciphertext under `DATA_ENCRYPTION_KEY`. A restored database whose key is lost is
fully intact by row count and completely unreadable in fact: every user re-links
every account.

R-20.3 therefore requires two independent copies of the key: the Fly secret and
the founder's macOS Keychain. Confirm presence, never value:

```bash
fly secrets list -a coiny-api | grep DATA_ENCRYPTION_KEY
security find-generic-password -s coiny-data-encryption-key >/dev/null && echo present
```

**Correction to the audit.** Rows 4.12.10 and 1.11.7 state there is no versioned
envelope and no re-encryption tooling. That was true when Part 4 was written on
2026-08-15 and is not true now. `src/util/crypto.ts` writes versioned envelopes
and exposes `envelopeKeyVersion` and `needsReencryption`; `config.ts` carries
`DATA_ENCRYPTION_KEY_VERSION` and a decrypt-only `DATA_ENCRYPTION_KEYS_PREVIOUS`
keyring; and `scripts/rotate-encryption-key.ts` sweeps rows onto a new key. So a
*superseded* key is survivable as long as it stays listed in
`DATA_ENCRYPTION_KEYS_PREVIOUS`. Losing **every** key still loses the data.

## The drill

### 1. Capture the baseline, before restoring

```bash
source bin/load-secrets.sh && pnpm --filter coiny-backend exec \
  tsx scripts/verify-restore.ts baseline > /tmp/restore-baseline.json
```

Counts every table in `public` by querying `information_schema`, so a migration
that adds a table does not quietly fall outside the drill.

### 2. Note the wall clock, and restore

Start a timer. This number is the RTO, and `engineering-budgets.md` §7 currently
claims "RTO < 4 h, rehearsed" on the strength of no rehearsal at all. Whatever
you measure replaces that claim.

Neon console → Branches → `staging` → Restore. Pick a timestamp inside the
restore window (6 hours on Free, 7 days on Launch).

### 3. Verify

```bash
source bin/load-secrets.sh && pnpm --filter coiny-backend exec \
  tsx scripts/verify-restore.ts verify /tmp/restore-baseline.json
```

It asserts the three things R-20.2 names, and exits non-zero on any failure:

| Check | Passes when |
|---|---|
| Row counts | Every table is within 5% of baseline |
| Freshness | `max(net_worth_daily.date)` is yesterday |
| Decryptability | A known `access_token` decrypts, and is not returned unchanged |

The decryptability check is the one that distinguishes a real recovery from a
restored-but-worthless database. If it is the only failure, the problem is the
key, not the restore, and re-restoring will not help.

### 4. Re-apply deletions, before any traffic

A restore brings back every account deleted since the timestamp you restored to.
The privacy policy says backups are never used to restore a deleted account, and
`deleted_user_ids` (migration 0067) plus this sweep is what makes that true.

```bash
source bin/load-secrets.sh && pnpm --filter coiny-backend exec \
  tsx scripts/purge-resurrected-users.ts --dry-run
# then the same command without --dry-run
```

Counts only, never ids. Zero is the expected result inside a six-hour window;
non-zero is the number of people whose deletion this restore would have undone.
`docs/backup-runbook.md` owns the reasoning.

### 5. Record the result

Stop the timer. Write the measured wall clock into `engineering-budgets.md` §7,
replacing the unrehearsed 4-hour figure, and note the date of the drill.

### 6. Clean up

Delete the `staging_old_{timestamp}` branch Neon left behind, or it counts
against the Free plan's branch allowance and becomes a second copy of
real-shaped data (audit row 2.9.3 is the same problem).

## When this is for real

Order matters, because restoring first and rotating later leaves a window where
the old credential still works:

1. Restore the branch to the last known-good timestamp.
2. Run the verify step above before pointing traffic at it.
3. Only then rotate credentials, following `docs/incident-response.md`.
