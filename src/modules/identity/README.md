# M1 — Identity

Auth, session, profile, roles, and entitlements.

## Public API

- `useSession()` — session state, guest mode, sign in/up/out
- `useProfile()` — `profiles` row for the signed-in user
- `hasEntitlement(feature, role)` — access checks (M13 expands this)

## Does NOT

- Own catalog data (see M2)
- Persist OAuth tokens outside Supabase Auth session storage
