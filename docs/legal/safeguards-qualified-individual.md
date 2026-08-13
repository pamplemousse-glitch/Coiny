# FTC Safeguards Rule: Designation of Qualified Individual

Athanor Works LLC ("the company"), operator of Coiny, maintains an information
security program as required by the FTC Safeguards Rule, 16 CFR 314 (issued
under the Gramm-Leach-Bliley Act). This document is the written designation
required by 16 CFR 314.4(a).

## Designation

The company designates **Antoine Wiley, Founder, Athanor Works LLC** as the
Qualified Individual responsible for overseeing, implementing, and enforcing
the company's information security program, effective as of the date signed
below.

(Unverified: confirm this is the founder's full legal name as it appears in the
LLC formation documents before signing.)

The Qualified Individual's responsibilities:

- Oversee the information security program described across this directory:
  the service-provider oversight list (`service-providers.md`), the data
  disposal schedule (`data-disposal-schedule.md`), and the technical controls
  documented in `docs/prd.md` section 21 and `.claude/rules/security.md`.
- Verify and maintain MFA on every account with access to systems holding
  customer information: Fly.io, Neon, the Plaid dashboard, Apple Developer,
  and Google Cloud (per 314.4(c)(5); tracked as PRD R-21.2).
- Maintain access controls (314.4(c)(1)): today, the founder is the only
  person with production access; this fact is itself the access-control
  record. Revisit on first contractor or employee.
- Maintain encryption of customer information in transit (TLS, enforced by
  Fly `force_https`) and at rest (field-level AES-256-GCM for tokens, keys,
  email, and reaction history; Neon disk encryption underneath) (314.4(c)(3)).
- Monitor and log authorized-user activity (314.4(c)(8)): server request
  logging with pseudonymous identifiers only.
- Complete annual security training appropriate to a solo operator
  (314.4(e)): at minimum, review of this program, the Plaid security
  requirements, and current phishing/credential-theft practice, self-recorded
  with a date.
- Oversee service providers per `service-providers.md` (314.4(f)).
- Ensure disposal of customer information per `data-disposal-schedule.md`
  (314.4(c)(6)).
- Report any "notification event" (acquisition of unencrypted customer
  information affecting 500 or more consumers) to the FTC within 30 days of
  discovery (314.4(j)), and track state breach-notification duties for any
  event affecting even one resident.
- Watch the consumer count. At 4,000 consumers, begin building the elements
  waived below; at 5,000 they become mandatory.

## Elements this program deliberately omits, and why

Under 16 CFR 314.6, financial institutions maintaining customer information on
fewer than 5,000 consumers are exempt from: the written risk assessment
(314.4(b)(1)), continuous monitoring or penetration testing and vulnerability
scanning (314.4(d)(2)), the written incident response plan (314.4(h)), and the
annual written report to a governing body (314.4(i)).

Coiny currently has zero production consumers and plans a 30-tester beta. The
company relies on this exemption and does not maintain those four documents.
This is a statutory exemption, not an oversight. Trigger to revisit: 4,000
consumers (alarm threshold per docs/obligations.md section 7), or any investor,
partner, or regulator request.

## Signature

Adopted by Athanor Works LLC:

Signature: ______________________
Name: Antoine Wiley
Title: Founder and Qualified Individual
Date: ______________________

(Founder task: print or PDF-sign this once the legal name is confirmed. An
unsigned designation is not a designation.)
