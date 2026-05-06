# Ethara Teams Production Test Outcomes

Date: 2026-05-07  
Target: https://ethara-teams-production.up.railway.app/  
Source catalog: `docs/system-test-cases.md`  
Tester: Codex using Playwright against the deployed Railway app.

## Executive Summary

The deployed Ethara Teams production app is broadly functional across authentication, dashboard navigation, project isolation, RBAC, project chat, task APIs, calendar APIs, PWA assets, and Railway health checks.

Result summary:

| Area | Result | Notes |
| --- | --- | --- |
| Railway health | Pass | `/api/health` returns `200` with service marker. |
| Public pages | Pass | `/`, `/login`, `/register`, and branded 404 load. |
| Credentials auth | Pass | Manager and member demo accounts authenticate. |
| Google OAuth entry | Pass | Login CTA is visible and redirects to Google OAuth. Full callback requires a real Google user session. |
| Dashboard routes | Pass | `/dashboard`, `/dashboard/tasks`, `/dashboard/calendar`, `/dashboard/chat`, `/dashboard/reports`, `/dashboard/team` deep-link correctly. |
| Sidebar icons | Pass | Home, Tasks, Calendar, Chat, Reports, Team navigate correctly. Settings route was added and verified on production at `/dashboard/settings`. |
| RBAC | Pass | Members cannot create projects/tasks or see admin controls. |
| Project tenant isolation | Pass | New projects are isolated; non-members get `403 Project access denied`. |
| Project/team flow | Pass | Admin can create project, add existing member, then assign task to that member. |
| Task flow | Pass | Task create, assign, update status/order, and soft delete APIs work. |
| Project chat | Pass | Project-level messages save with mention/task-ref text. |
| Task comments | Pass | Task comments save with mention/task-ref text. |
| Calendar | Pass | Event create, update, and soft delete work. |
| Validation/security smoke | Pass | Anonymous APIs blocked; invalid project/calendar payloads rejected with `422`. |
| PWA | Pass | Manifest and service worker are available. |
| Realtime console smoke | Pass | No obvious socket failure observed on deployed chat route. |
| Mobile smoke | Pass | Mobile dashboard loads selected project without blank screen. |

## Test Environment Notes

The requested Browser plugin was attempted first, but the in-app browser runtime failed on this machine with an app-server path error. Playwright was used as the browser automation fallback against the same deployed URL.

Test accounts used:

| Role | Email | Password |
| --- | --- | --- |
| Manager 1 | `manager1@ethara.dev` | `Password@123` |
| Member 1 | `member1@ethara.dev` | `Password@123` |
| Member 4 | `member4@ethara.dev` | `Password@123` |
| Member 8 | `member8@ethara.dev` | `Password@123` |

Screenshots captured:

| Artifact | Purpose |
| --- | --- |
| `test-results/prod-dashboard-desktop.png` | Desktop dashboard visual smoke. |
| `test-results/prod-dashboard-mobile-seed.png` | Mobile dashboard visual smoke. |
| `test-results/prod-login.png` | Production login and Google CTA verification. |

## Detailed Outcomes

### Navigation and Pages

| Test IDs | Outcome | Evidence |
| --- | --- | --- |
| NAV-001 | Pass | Landing page loads with title `Ethara Teams`. |
| NAV-002 | Pass | `/login` loads with email/password, demo login, and Google CTA. |
| NAV-003 | Pass | `/register` loads with title `Start workspace | Ethara Teams`. |
| NAV-004 | Pass | Anonymous `/dashboard` redirects to `/login`. |
| NAV-005 | Pass | Manager dashboard loads selected project, sidebar, metrics, chat, and controls. |
| NAV-006 | Pass | Unknown route renders branded 404 and no stack trace. |
| NAV sidebar | Partial | Main icons route correctly. Settings deployed build routes to Reports. Local fix adds `/dashboard/settings`. |

Dedicated route checks:

| Route | Outcome |
| --- | --- |
| `/dashboard` | Pass |
| `/dashboard/tasks` | Pass |
| `/dashboard/calendar` | Pass |
| `/dashboard/chat` | Pass |
| `/dashboard/reports` | Pass |
| `/dashboard/team` | Pass |
| `/dashboard/settings` | Pass |

### Authentication

| Test IDs | Outcome | Evidence |
| --- | --- | --- |
| AUTH-001 | Pass | `manager1@ethara.dev` signs in and reaches dashboard. |
| AUTH-008 | Pass | `member4@ethara.dev` signs in and reaches dashboard without admin controls. |
| AUTH-009 | Pass | `Continue with Google` starts OAuth and redirects to `accounts.google.com`. |
| AUTH-010 | Blocked manual | OAuth callback success requires choosing a real Google account and consent. Redirect URI is correct: `/api/auth/callback/google`. |

### RBAC and Security

| Test IDs | Outcome | Evidence |
| --- | --- | --- |
| ATC-03 / NAV-004 | Pass | Anonymous dashboard access redirects to login. |
| SEC unauth APIs | Pass | `/api/projects`, `/api/notifications`, `/api/calendar-events` return `401`. |
| RBAC member project create | Pass | Member POST `/api/projects` returns `403 Only admins can create projects`. |
| RBAC member task create | Pass | Member POST project tasks returns `403 Insufficient permissions`. |
| Tenant isolation | Pass | Non-member read of isolated project tasks returns `403 Project access denied`. |
| Validation | Pass | Invalid calendar and project payloads return `422 Validation failed`. |

### Projects, Team, and Tasks

| Flow | Outcome | Evidence |
| --- | --- | --- |
| List projects | Pass | Manager receives active projects from `/api/projects`. |
| Create project | Pass | Manager POST `/api/projects` returns `201` with project ID. |
| Create task in new project | Pass | Unassigned task creation returns `201`. |
| Add project member | Pass | Admin adds `member1@ethara.dev`; response `201` with `kind: member`. |
| Assign task after member add | Pass | Task created with `assignedToId` matching added member. |
| Member project access | Pass | Added member can read project tasks. |
| Outsider project access | Pass | Non-member cannot read project tasks. |
| Cleanup | Pass | QA tasks and QA projects were soft-deleted after test. |

Important note: an initial task assignment test tried to assign a user who was not yet a member of the newly created project. The API correctly returned `403 Project access denied`. This is expected tenant-guard behavior, not a bug.

### Collaboration

| Test IDs | Outcome | Evidence |
| --- | --- | --- |
| CHAT-001 | Pass | Project message POST returns `201`. |
| COMM-001 | Pass | Task comment POST returns `201`. |
| Mention text | Pass smoke | `@member1` text is accepted and persisted in project chat/comment payloads. |
| Task refs | Pass smoke | `#task-title` text is accepted; hydration depends on matching existing task slug/title. |
| Realtime | Pass smoke | No obvious websocket/socket console failure observed on deployed chat route. |

### Calendar

| Test IDs | Outcome | Evidence |
| --- | --- | --- |
| CAL-001 | Pass | Calendar event create returns `201`. |
| CAL-002 | Pass | Status update to `COMPLETED` returns `200`. |
| CAL-003 | Pass | Soft delete returns `200`. |
| Invalid payload | Pass | Bad title/reminder rejected with `422`. |

### PWA and Deployment

| Test IDs | Outcome | Evidence |
| --- | --- | --- |
| DEP-001 | Pass | `/api/health` returns `200`. |
| PWA manifest | Pass | `/manifest.webmanifest` returns `name`, `short_name`, icons, and standalone display. |
| PWA service worker | Pass | `/sw.js` returns `200`. |

## Findings

### F-001: Settings icon routes to Reports in previous deployed build

Severity: Medium  
Status: Fixed and deployed  
Evidence: Clicking `Settings` navigated to `/dashboard/reports?projectId=seed-project-ethara`.  
Fix: Added `settings` to `DashboardView`, added `/dashboard/settings`, included settings in rail items, and added a `SettingsPanel`. Production retest confirmed `/dashboard/settings?projectId=seed-project-ethara` renders successfully.

### F-002: Error boundary hardening not yet deployed

Severity: Medium  
Status: Fixed and deployed  
Evidence: Local audit found the error boundary used nested document tags and exposed raw error text.  
Fix: `src/app/error.tsx` now renders a layout-safe fallback and avoids exposing raw exception messages.

### F-003: OAuth callback success requires manual Google account completion

Severity: Low  
Status: Manual validation remaining  
Evidence: Production redirects to Google with the correct client and callback URL. Automated testing stopped before account selection/consent.  
Next validation: sign in with a Google test account and confirm dashboard session creation.

### F-004: Rate limiting not proven

Severity: Medium  
Status: Not covered by current implementation smoke  
Evidence: Auth/API validation works, but no automated abuse/rate-limit behavior was verified.  
Recommendation: add request throttling for auth, comments, project chat, task mutation, calendar mutation, and invitations before heavy public usage.

## Local Quality Gate After Fixes

| Command | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run test` | Pass, 3 files / 12 tests |
| `npm run build` | Pass |

## Release Recommendation

Production is usable for client review. The main functional flows are green, and the Settings route/error-boundary fixes have been pushed and verified after Railway redeploy. Before final handoff, complete these items:

1. Manually complete one Google OAuth callback with a real test account.
2. Add automated Playwright coverage for production-like sidebar navigation and the new project/team/task assignment flow.
3. Add rate limiting for public write endpoints.
