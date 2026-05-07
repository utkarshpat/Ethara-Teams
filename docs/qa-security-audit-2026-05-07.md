# QA And Security Audit - 2026-05-07

Scope: checks were driven from `docs/system-test-cases.md`, with focus on release-gate automation, auth/RBAC/security smoke, secrets hygiene, and Browser UI coverage.

## Fixed

- Cleared `.env.example` secret-looking placeholders so no credential-like values are stored in tracked env examples.
- Made the workspace icon rail visible below `lg` width. Before this fix, tablet/mobile dashboard widths could hide primary navigation entirely.
- Added a stable accessible name to the desktop workspace project switcher, so E2E/admin accessibility checks can target it reliably.

## Secrets And Repo Hygiene

- `.env`, `.env.local`, `.env.production`, `.next`, `node_modules`, `test-results`, and `playwright-report` are ignored by `.gitignore`.
- Tracked-file secret scan found no real Google API keys, OpenRouter keys, Resend keys, Postgres URLs, or private keys.
- `.env.example` now keeps only empty placeholders except safe local/default values.

## Automated Results

- `npm run lint`: pass.
- `npm run test`: pass, 4 test files and 15 tests.
- `npm run test:e2e`: pass, 4 Playwright tests.
- `npm run build`: pass.
- `npx prisma migrate deploy`: pass, no pending migrations.
- `/api/health`: pass, `200 {"ok":true,"service":"ethara-teams"}`.
- `npm audit --audit-level=high`: pass for high/critical. Moderate transitive advisories remain in `ip-address` and Next's nested `postcss`.

## Manual API Security Smoke

- Unauthenticated `/api/projects`: `401`.
- Admin `/api/projects`: `200`.
- Member project create attempt: `403`.
- Member task create attempt: `403`.
- Unknown member add path: `404` with manual mail flow.
- Calendar invalid range: `422`.

## Browser UI Smoke

- Login page: demo login, Google login, email/password fields, assistant FAB visible.
- Register page: account fields visible.
- Manager dashboard: dashboard loads and responsive icon rail is available.
- Team page: admin/member controls and admin request section visible.
- Add people dialog: email/role fields visible; unknown member path exposes manual mail option.
- Chat, Calendar, Reports pages: main surfaces visible.
- Assistant popup: floating assistant opens; no console errors observed.

## Residual Notes

- Current automated E2E coverage is still small compared with the full catalog. The highest-value next automation is API/RBAC coverage for task comments, project chat, calendar ownership, and notification ownership.
- `npm audit` reports moderate issues only. The Next/PostCSS advisory suggests a breaking forced downgrade, so it was not applied.
