# Admin console rollout (PRs #28, #31, #32, #33)

These four PRs are stacked. Merge them **in this order**, each into the one
below it as GitHub retargets them, ending on `main`:

1. #28 Solo and Team plans with a 30-day free trial
2. #31 Plans & Pricing page
3. #32 Admin roles, settings, promo codes, custom deals
4. #33 Overview, payments queue, farmer support, messages, two-step sign-in

PR #30 (admin bug fixes) is separate and targets `main`; it conflicts with this
stack in `src/lib/admin-auth.ts`. Keep the stack's version of that file.

## How the database gets updated

Nothing has to be run by hand. The production build (`npm run build`) starts
with `scripts/prisma-deploy.mjs`, which runs `prisma migrate deploy` when
`VERCEL_ENV=production`. Preview and CI builds never migrate.

When the stack reaches `main` and Vercel builds production, these migrations
apply, in order:

| Migration | From | What it does |
|---|---|---|
| `20261101120000_solo_team_plans` | #28 | Adds `farms.plan_type` and `farm_members.access_paused_at`. **Changes data:** every farm without a paid plan or a running trial gets a fresh 30-day trial from that day, so nobody is locked out on deploy. |
| `20261102120000_billing_settings` | #31 | New `billing_settings` table (empty: built-in prices apply until an admin saves). |
| `20261102130000_admin_settings_promos_overrides` | #32 | New `app_settings`, `admin_audit_log`, `promo_codes`, `farm_overrides`; `admin_user.role` (existing admins become `SUPER_ADMIN`). |
| `20261103090000_admin_support_sessions_2fa` | #33 | New `farm_notes`, `farm_messages`, `admin_sessions`; two-step columns on `admin_user`. **Changes data:** each still-active old-style subscription is copied onto its farm (same tier, same end date); skipped if the old tables do not exist. |

All four only add tables and columns (`IF NOT EXISTS`), are safe to run twice,
and were tested on a throwaway Postgres: from the schema before #28, run a
second time over existing data, and without the old subscription tables.

If a migration fails, the deploy stops (the previous version keeps serving) and
the migration is not marked as applied. Fix the cause, then run
`prisma migrate resolve --rolled-back <name>` and redeploy.

## Before merging the last PR

- Make sure these are set in Vercel (production):
  - `DATABASE_URL` (pooler, port 6543) and `DIRECT_URL` (direct, port 5432);
    `prisma migrate deploy` uses `DIRECT_URL`.
  - `HATCHLOG_ADMIN_SESSION_SECRET` (16+ characters; required in production).
    It also encrypts two-step secrets, so **do not change it later** or every
    admin has to set up two-step sign-in again.
  - `HATCHLOG_LICENSE_TOKEN_SECRET` (desktop license payments need it).
- Each super admin should have an authenticator app ready (Google
  Authenticator, Microsoft Authenticator or Authy).

## Right after the deploy

1. **Every admin is signed out once.** Sign-ins from before #33 are not
   tracked sessions, so they no longer count.
2. Sign in. Super admins are taken to **Your account** to set up two-step
   sign-in before anything else.
3. Open **System** (`/admin/system`). "Admin console tables" should be OK and
   "Latest migration" should be `20261103090000_admin_support_sessions_2fa`.
   Fix anything marked Problem.
4. Open **Plans & Pricing** and set the Mobile Money number, account name and
   instructions (shown when a farm pays by MoMo).
5. Check **Payments** for Mobile Money requests that farms made before the
   deploy; approve or close them.
6. Optional: create Billing and Support admins under **Admins** instead of
   sharing a super admin login.
