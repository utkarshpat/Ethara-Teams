# Ethara Teams Testing Guide

## Test Layers

Ethara Teams now has a practical automated test foundation for the modular monolith:

- Unit tests with Vitest for shared domain utilities, workspace guards, and task RBAC service rules.
- E2E tests with Playwright for anonymous access protection, credentials-authenticated dashboard access, and Admin/Member UI permission checks.

For the full release QA catalog across every page, field, role, API, realtime flow,
database-sync path, and security boundary, see
[`docs/system-test-cases.md`](./system-test-cases.md).

## Commands

```bash
npm run test
npm run test:coverage
npm run test:e2e
npm run test:e2e:ui
```

## Unit Coverage Scope

Current unit tests cover:

- `extractMentionKeys`, `extractTaskRefs`, and `slugifyTaskTitle`
- project membership guard behavior
- soft-deleted project/task rejection
- role-gated project operations
- task mutation permissions for Admin, assignee Member, and non-assigned Member
- reassignment notification fanout

## E2E Coverage Scope

Current Playwright coverage verifies:

- anonymous `/dashboard` users are redirected to `/login`
- Admin credentials can access dashboard management controls
- Member credentials cannot access Admin controls
- unauthenticated project API calls return `401`

E2E login uses the same NextAuth credentials callback as the UI, then opens the dashboard with the authenticated browser context. This avoids flaky hydration timing while still validating the production auth/session path.

## Notes

The local E2E suite runs serially because the current Railway Postgres connection can be slower than an in-machine test database. When a dedicated test database is added, the suite can safely move toward broader parallelism and data-isolated setup/teardown.
