# The nightly backup

Closes G1.27 in `docs/prelaunch-verification/07-runbook.md` (audit rows 4.12.2,
4.12.3, 2.9.2, 2.9.4 and 5.9.6) and builds PRD R-20.1.

This is the **second** backup layer. Neon's point-in-time window is the first,
and `docs/restore-runbook.md` is the procedure for that one. They fail
differently and are recovered differently, which is why they are two documents.

| | Neon PITR | This |
|---|---|---|
| Window | 6 hours (Free plan) | 30 days |
| Covers | "I ran the wrong migration an hour ago" | "the corruption started last week" |
| Restores | In the Neon console, minutes | `pg_restore` into a fresh branch |
| Needs | Neon access | Neon access **and the backup private key** |

Before this existed, the six-hour window was the entire backup strategy, and the
RPO of "24 h worst case" in `engineering-budgets.md` §7 described a nightly dump
that did not exist. `docs/legal/privacy-policy.md` promises deleted data is gone
from backups within 30 days; that sentence is about this job.

## The founder step, once

Nothing runs until this is done, and the workflow says so in the run log rather
than failing every night.

**1. Generate the pair.** 4096-bit RSA. Do this on the laptop, not in CI:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -out /tmp/coiny-backup-key.pem
openssl rsa -in /tmp/coiny-backup-key.pem -pubout -out /tmp/coiny-backup-key.pub
```

**2. Put the private half in the Keychain, and nowhere else.**

```bash
security add-generic-password -a "$USER" -s coiny-backup-private-key -w
# paste the contents of /tmp/coiny-backup-key.pem at the prompt, then:
rm /tmp/coiny-backup-key.pem
```

**3. Put the public half in GitHub.** Repository → Settings → Secrets and
variables → Actions → New repository secret, named `BACKUP_PUBLIC_KEY`, with the
full PEM including the BEGIN/END lines.

```bash
cat /tmp/coiny-backup-key.pub   # copy this
```

**4. Confirm `NEON_API_KEY` is already set.** `migration-rehearsal.yml` uses the
same secret; if that workflow has ever run, it is there.

Then run **Actions → Nightly Backup → Run workflow** once by hand, rather than
finding out at 07:10 UTC.

### Why the private key is not in CI

The dump job runs unattended on a GitHub runner. If it held a key that could
decrypt, then anything that could read that runner's secrets could read every
backup ever taken. It holds the public half only, so a full compromise of CI
yields the ability to *write* backups and nothing else.

This is also why the backup key is a **separate key** from
`DATA_ENCRYPTION_KEY`. A backup encrypted with the key the server already holds
protects against nothing that matters.

**Two keys now, and losing either loses different things.** Lose
`DATA_ENCRYPTION_KEY` and every stored token is unreadable in every copy,
including these. Lose the backup private key and the last 30 days of dumps are
unreadable while Neon's window still works. Both belong in the Keychain, and
neither has a second copy anywhere.

## What the job does

`.github/workflows/backup.yml`, 07:10 UTC daily:

1. `pg_dump --format=custom` against the Neon `production` branch, direct
   endpoint (not pooled: PgBouncer in transaction mode cannot serve pg_dump).
2. Straight down a pipe into `backend/scripts/backup-encrypt.ts`, so the
   plaintext dump never touches the runner's disk.
3. gzip, then AES-256-GCM under a fresh per-dump key, with that key wrapped to
   `BACKUP_PUBLIC_KEY` (`backend/src/backup/envelope.ts`).
4. Uploaded as a GitHub artifact with `retention-days: 30`.

The artifact is readable by anyone with repository access, and that is fine
exactly because of step 3: without the private key it is 30 days of noise.

## Restoring from one of these

```bash
# 1. Download the artifact from the Actions run, then:
export BACKUP_PRIVATE_KEY="$(security find-generic-password -s coiny-backup-private-key -w)"
pnpm --filter coiny-backend exec tsx scripts/backup-decrypt.ts \
  coiny-production-2026-09-02T07-10-04Z.dump.enc > /tmp/coiny.dump

# 2. Restore into a NEW Neon branch, never over a live one.
pg_restore --clean --if-exists --no-owner -d "$TARGET_DATABASE_URL" /tmp/coiny.dump

# 3. Verify, with the same harness the PITR drill uses.
source bin/load-secrets.sh && pnpm --filter coiny-backend exec \
  tsx scripts/verify-restore.ts verify /tmp/restore-baseline.json

# 4. RE-APPLY DELETIONS. See below. Do this before any traffic reaches it.
source bin/load-secrets.sh && pnpm --filter coiny-backend exec \
  tsx scripts/purge-resurrected-users.ts --dry-run
```

`backup-decrypt.ts` refuses a file that was truncated, altered, or encrypted to
a different key. There is no partial mode: a dump that decrypts to something
other than what was taken is worse than no dump, because it gets restored with
confidence.

## Step 4, which is the one that gets forgotten

**A restore resurrects every account deleted since the copy was taken.**

`docs/legal/privacy-policy.md` says backups are never used to restore a deleted
account. Until G1.27 nothing made that true: deletion cascades the user row away
and left no trace, so there was no list to re-delete anyone from.

`deleted_user_ids` (migration 0067) is that list. It is written inside the same
transaction as the deletion, carries a user id and a date and nothing else, has
no foreign key (the row it names is gone by construction), and is pruned by the
nightly retention pass 45 days after the deletion, which is past the point where
any surviving dump could bring that account back.

```bash
# Counts only, never ids.
pnpm --filter coiny-backend exec tsx scripts/purge-resurrected-users.ts --dry-run
pnpm --filter coiny-backend exec tsx scripts/purge-resurrected-users.ts
```

Zero re-deleted is the expected result of a restore inside Neon's window.
Non-zero is the number of people whose deletion the restore would have undone.

The sweep is deliberately **not** automatic on boot. A sweep that runs unattended
against a database nobody has looked at yet is a way to turn a bad restore into
deleted rows.

## What is still not covered

- **Retention is GitHub's, not ours.** Deleting the repository, or an
  organisation-level artifact purge, takes the dumps with it. A second
  destination (object storage in another account) is the next increment, and it
  is a cost decision rather than an engineering one.
- **Nothing verifies a dump can be restored.** The envelope round trip is tested
  on every commit (`backend/tests/backup-envelope.test.ts`), which proves the
  *encryption* is reversible; it does not prove `pg_restore` accepts the file.
  Do one full restore into a scratch branch before the first real user, and
  record the wall clock the way R-20.2 asks.
