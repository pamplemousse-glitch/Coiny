# Consent Copy and Purpose Strings (Apple 5.1.1(ii))

The section 24 telemetry pipeline must not collect anything before the user
has consented (Apple 5.1.1(ii); PRD section 27 checklist). This file provides
the exact copy and says where it lands. **The onboarding and settings views are
owned by another workstream; nothing here edits a view.** Whoever builds the
telemetry client wires these strings in.

## 1. The consent line

**Where it lands:** onboarding screen 0 (Sign in, PRD section 5.2), as one line
of secondary text directly beneath the Sign in with Apple button, in
`ios/Coiny/Views/SignInView.swift`. Screen 0 is the only screen every user
passes before any event could fire (`signup_completed` is the first event in
R-24.2), and R-5.1 forbids adding a dedicated consent screen without removing
one.

Exact copy (app voice, two lines):

> By continuing you agree to the Terms of Service and Privacy Policy.
> Coiny records how you use the app, never amounts or merchant names, to fix
> what does not work. Turn this off any time in Settings.

"Terms of Service" and "Privacy Policy" are tappable links to the hosted URLs.
Signing in constitutes the consent; no separate checkbox. (Judgment call:
disclosure-plus-action is the prevailing pattern Apple accepts for first-party,
non-tracking analytics; a lawyer may prefer an explicit toggle. Flagged for
attorney review with the policy.)

**Enforcement rule for the telemetry client:** no event may be enqueued before
the first successful sign-in completes, and none while the Settings toggle
below is off. `signup_completed` fires after consent by construction.

## 2. The Settings toggle

**Where it lands:** `ios/Coiny/Views/SettingsView.swift`, a toggle row.

- Label: **Share usage data**
- Footer text: "Anonymous-style product events tied to your account, like
  'app opened' or 'goal completed'. Never amounts, never merchant names. Used
  only to improve Coiny."
- Default: on (consent was given at sign-in). Turning it off stops the client
  queue immediately; no backend call needed, though flushing a
  `push_permission_changed`-style state event is fine before stopping.

## 3. Purpose-string review (Info.plist), 2026-08-13

Reviewed against every capability the code actually uses:

| Key | Status | Finding |
|---|---|---|
| `NSBluetoothAlwaysUsageDescription` | **Removed** | No CoreBluetooth code exists anywhere in `ios/Coiny`; hardware is parked (vision section 8). The string, and the `bluetooth-central` background mode, were hardware-era leftovers; an unused background mode is an App Review 2.5.4 rejection risk. Removed from `project.yml` and `Info.plist` this change; restore both when hardware ships |
| `remote-notification` background mode | Kept | Push is implemented (`CoinyApp.swift` registers; APNs backend exists). No purpose string is required for push; the system prompt covers it, pre-framed by S-6 |
| Camera, photo library, location, contacts, microphone, Face ID | Correctly absent | No API use found. When the app-lock ships (open decision B11), add `NSFaceIDUsageDescription`: "Coiny uses Face ID to lock the app so only you can see your finances." |
| Tracking (`NSUserTrackingUsageDescription`) | Correctly absent | Nothing tracks; the privacy manifest declares `NSPrivacyTracking = false`. Do not add ATT |

Conclusion: with Bluetooth removed, the purpose-string surface is complete and
minimal. Any new capability must add its string in `ios/project.yml` (which
generates Info.plist) in the same PR.
