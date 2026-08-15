# Security policy

Coiny is operated by Athanor Works LLC. It connects to people's financial
accounts, so we would rather hear about a problem awkwardly than not at all.

## Reporting a vulnerability

**[Open a private report](https://github.com/pamplemousse-glitch/Coiny/security/advisories/new)**
through GitHub private vulnerability reporting. That keeps the details out of
public view while we work on a fix.

The machine-readable version of this policy is served at
`/.well-known/security.txt` (RFC 9116) by the API.

Useful things to include: what you did, what happened, what you expected, and
anything that helps us reproduce it. A rough proof of concept beats a polished
report we cannot reproduce.

## What to expect

Coiny is a solo project. These are good-faith targets, not a contractual SLA.

| Stage | Target |
|---|---|
| Acknowledgement | 5 business days |
| Initial assessment | 10 business days |
| Fix or documented decision | depends on severity; we will tell you which |

We will credit you when the fix ships, if you want the credit. There is
**no bug bounty and no payment**. Reports are still very welcome.

Please give us a reasonable chance to fix an issue before publishing it. If we
go quiet on you, say so in the thread before going public.

## Scope

In scope: the Coiny API and its data handling, the iOS and Android clients, and
anything in this repository.

Out of scope, because they are not ours to fix, though we do want to hear if you
find something: our providers' own infrastructure (Plaid, Neon, Fly.io, Apple,
and the rest of the list in `docs/legal/service-providers.md`). Report those to
the provider directly.

Also out of scope: findings that amount to a scanner's opinion with no
demonstrated impact, missing headers on endpoints that serve no browser-rendered
content (see `backend/src/plugins/security-headers.ts` for which ones we
deliberately do not set, and why), and social engineering of the founder.

## Please do not

Access, modify, or delete data belonging to anyone but yourself; degrade the
service for other people; or run automated scanning heavy enough to look like an
attack. Coiny runs in Plaid **sandbox** today with no real bank data and no real
users, so there is very little worth going after and no excuse for a
denial-of-service test.

## Handling on our side

A confirmed report that involves customer information is triaged through
`docs/incident-response.md`, which carries the FTC and state notification clocks
that would apply.
