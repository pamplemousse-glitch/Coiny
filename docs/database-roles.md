# Two database roles: migrator and runtime

Closes G2.9 in `docs/prelaunch-verification/07-runbook.md`.

**Do this before production holds data.** It is a setup step on an empty
database and a live migration afterwards, which is the entire reason the runbook
puts it at Gate 2 rather than later.

## Why

With one role, the credential the API server holds for its whole life can
`DROP TABLE`. A SQL injection, a leaked Fly secret or a mistaken script reaches
the schema, not just the rows.

With two, the runtime role has no DDL grant at all, and the migrator credential
is only present in the process Fly runs as the release command, for the seconds
that command takes. Nothing else ever holds it.

This is not a substitute for the parameterised queries Drizzle already emits. It
is the bound on what a failure of those costs.

## What the code does

`connectionStringFor(role)` in `src/db/client.ts`:

| Caller | Role | Reads |
|---|---|---|
| `src/server.ts` | `runtime` | `DATABASE_URL` |
| `src/db/migrate-run.ts` (Fly release command) | `migrator` | `MIGRATION_DATABASE_URL`, falling back to `DATABASE_URL` |
| `scripts/*.ts` | `runtime` | `DATABASE_URL` |

**The fallback is deliberate.** With `MIGRATION_DATABASE_URL` unset, both roles
resolve to `DATABASE_URL` and the setup is exactly what it was before. Tests,
local dev and staging gain nothing from the split and are left alone. Only
production sets the second variable.

`migrate-run.ts` logs `db_role=split` or `db_role=single` on every release, so a
production deploy that silently ran as the runtime role is visible in the log
rather than discovered at the first DDL statement.

## Setup, on the Neon production branch

### 1. Create the two roles in the Neon console

Console → your project → **Roles** → **New Role**. Create `coiny_migrator`,
then `coiny_runtime`.

Use the console rather than `CREATE ROLE` in SQL: Neon generates and stores the
password, so it never passes through your shell history or this chat. Copy each
connection string straight from the console into `fly secrets` and nowhere else.

### 2. Grant, in the Neon SQL editor

Run this as the branch owner role (the one the console gives you by default).

```sql
-- The migrator owns the schema and is the only role that may change it.
GRANT CREATE, USAGE ON SCHEMA public TO coiny_migrator;

-- The runtime may read and write rows, and may not change their shape.
GRANT USAGE ON SCHEMA public TO coiny_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO coiny_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO coiny_runtime;
```

### 3. The step that is easy to miss

```sql
-- Run this AS coiny_migrator, or it does nothing useful.
ALTER DEFAULT PRIVILEGES FOR ROLE coiny_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO coiny_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE coiny_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO coiny_runtime;
```

**Without this, every future migration creates a table the runtime role cannot
read.** The grants in step 2 cover the tables that exist when they run and
nothing created afterwards. Default privileges are recorded per granting role,
which is why this has to be attached to `coiny_migrator` specifically: privileges
set by the owner role do not apply to tables the migrator creates.

The failure mode is the one worth naming. The deploy succeeds, the release
command succeeds, the app boots, and the first request touching the new table
fails with `permission denied`. Nothing upstream of that request reports a
problem.

### 4. Set the Fly secrets

```bash
# The runtime connection string, from coiny_runtime.
fly secrets set -a coiny-api DATABASE_URL=...
# The migrator connection string, from coiny_migrator.
fly secrets set -a coiny-api MIGRATION_DATABASE_URL=...
```

### 5. Verify, after the first deploy

```bash
# Should print db_role=split. If it prints db_role=single the release command
# ran as the runtime role and the split is not in effect.
fly logs -a coiny-api | grep "migrate: starting"
```

Then, in the Neon SQL editor **as `coiny_runtime`**, confirm the runtime role
cannot do what it must not:

```sql
-- Expected: ERROR, permission denied for schema public
CREATE TABLE should_not_exist (id int);
```

A successful `CREATE TABLE` here means step 1 or step 2 granted the runtime role
more than it should have, and the split is decorative.

## Rotating either credential

Rotate in the Neon console, then `fly secrets set` the new string. The runtime
rotation restarts the app; the migrator rotation takes effect on the next
release and nothing is holding a stale connection in between, because the
migrator only connects during a release command.

## Staging

Staging stays single-role on purpose. It holds synthetic data, so the blast
radius the split bounds is not worth the second credential to rotate. If that
changes, the setup above applies unaltered: set `MIGRATION_DATABASE_URL` on
`coiny-backend` and the same code path takes over.
