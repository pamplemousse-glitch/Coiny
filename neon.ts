// Neon configuration as code. Applied with `npx neonctl deploy`, previewed with
// `npx neonctl config plan`.
//
// This file exists so the shape of the database estate is reviewable in a pull
// request instead of living only in a dashboard where nobody can see it change.
// It covers branch policy and services; the project, roles and databases
// themselves are still created by hand and are recorded in
// docs/environments-setup.md.
//
// Project: Coiny (noisy-bonus-65551609), org "Antoine".
//   production  br-rapid-haze-apncnynh  default, holds the migration history
//   staging     br-orange-mouse-ap2jgw62  copy-on-write child of production
import { defineConfig } from '@neon/config/v1';

export default defineConfig({
  // Coiny has its own auth (Sign in with Apple plus server-issued sessions) and
  // its own API. Neon's managed auth and Data API would be a second, unguarded
  // way into a database holding bank data, so both stay off.
  auth: false,
  dataApi: false,

  branch: (branch) => {
    if (branch.isDefault) {
      // production.
      //
      // `protected` requires a paid plan; on Free it is silently inert. It is
      // declared now so that upgrading turns it on without anyone remembering
      // to. It blocks deletion and reset, which are the two operations that
      // would destroy the only copy of the migration history.
      return {
        protected: true,
        postgres: {
          computeSettings: {
            autoscalingLimitMinCu: 0.25,
            autoscalingLimitMaxCu: 2,
          },
        },
      };
    }

    if (branch.name === 'staging') {
      // Long-lived, so no TTL. Small and suspends quickly: staging is idle
      // almost all of the time and nobody is watching a cold start.
      return {
        postgres: {
          computeSettings: {
            autoscalingLimitMinCu: 0.25,
            autoscalingLimitMaxCu: 1,
            suspendTimeout: '5m',
          },
        },
      };
    }

    if (!branch.exists) {
      // Anything else is a throwaway: a CI migration rehearsal or a scratch
      // branch. One day is longer than any of those legitimately live, and an
      // expiry means a forgotten branch stops costing money by itself.
      //
      // TTL also requires a paid plan, so until then the CI workflow deletes
      // its own rehearsal branch explicitly. Both paths are in place, because
      // relying on cleanup that only sometimes runs is how orphans accumulate.
      return {
        ttl: '1d',
        postgres: {
          computeSettings: {
            autoscalingLimitMinCu: 0.25,
            autoscalingLimitMaxCu: 0.25,
            suspendTimeout: '2m',
          },
        },
      };
    }

    // Returning {} leaves an existing branch alone, so re-applying this config
    // never silently rewrites settings somebody changed deliberately.
    return {};
  },
});
