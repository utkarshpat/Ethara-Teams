# Ethara Teams Complete System Test Cases

Version: 1.0  
Scope: Full functional, security, UI, API, realtime, database-sync, PWA, and deployment validation for the Ethara Teams production app.  
Target environments: Local dev, Railway staging/production, PostgreSQL via Prisma.  
Primary roles: Global Admin, Project Admin, Project Member, Anonymous user.

## 1. Test Strategy

### 1.1 Test Layers

| Layer | Purpose | Tooling |
| --- | --- | --- |
| Unit | Pure logic, validators, guards, parsers | Vitest |
| Integration | Services with Prisma and RBAC guards | Vitest + test DB |
| API | Route handler auth, validation, status codes | Playwright API / fetch |
| E2E | Real browser user journeys | Playwright |
| Security | Auth, tenant boundary, RBAC, input abuse | Manual + automated API tests |
| Visual/UX | Responsive layout, theme, all tabs/buttons | Browser/Playwright screenshots |
| Deployment | Railway build, migrate, health, env config | Railway logs + smoke checks |

### 1.2 Standard Test Accounts

| Role | Email | Password | Purpose |
| --- | --- | --- | --- |
| Manager 1 | `manager1@ethara.dev` | `Password@123` | Global Admin, project management |
| Manager 2 | `manager2@ethara.dev` | `Password@123` | Global Admin, admin invite/reassignment |
| Member 1 | `member1@ethara.dev` | `Password@123` | Project Member task execution |
| Member 2 | `member2@ethara.dev` | `Password@123` | Cross-member negative tests |
| Member 3-8 | `member3@ethara.dev` to `member8@ethara.dev` | `Password@123` | Team list, mentions, assignment scale |

### 1.3 Common Test Data Values

| Field | Valid Values | Invalid / Boundary Values |
| --- | --- | --- |
| Email | `qa.user+1@example.com`, lowercase/uppercase emails | empty, `abc`, `a@`, duplicate email, SQL-like string |
| Password | `Password@123`, 8-128 chars | empty, 7 chars, 129 chars, whitespace-only |
| Username | `qa_user`, `qa.user-01`, 3-32 chars | 2 chars, 33 chars, spaces, emoji, `<script>` |
| Project name | 2-120 chars | empty, 1 char, 121 chars, duplicate-looking name |
| Project description | empty, 1-500 chars | 501 chars, HTML/script payload |
| Task title | 2-160 chars | empty, 1 char, 161 chars |
| Task description | empty, 1-1200 chars | 1201 chars, multiline script text |
| Priority | `LOW`, `MEDIUM`, `HIGH`, `URGENT` | lowercase, unknown enum |
| Status | `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE` | unknown enum, null |
| Comment body | 1-1200 chars, `@mira`, `#task-title` | empty, 1201 chars, script text |
| Project chat body | 1-1600 chars, mentions and task refs | empty, 1601 chars |
| Calendar title | 2-160 chars | empty, 1 char, 161 chars |
| Calendar date range | end after start | end equal start, end before start |
| Reminder | null, 0, 10, 30, 60, 1440 | negative, >10080 |

## 2. Page and Navigation Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| NAV-001 | Landing page `/` | E2E | Open `/` as anonymous user. | Professional product landing loads, no demo/MVP wording, CTA links visible. |
| NAV-002 | Login navigation | E2E | Click Sign in / open `/login`. | Login page loads with Demo login, Google login, email/password fields. |
| NAV-003 | Register navigation | E2E | From login click Create an account. | `/register` loads with Google signup and name/username/email/password fields. |
| NAV-004 | Dashboard protection | Security | Open `/dashboard` without session. | Redirects to `/login` with no project/task data leaked. |
| NAV-005 | Authenticated dashboard | E2E | Login as Manager 1, open `/dashboard`. | Dashboard loads selected project, sidebar, Kanban, chat, metrics. |
| NAV-006 | Unknown page | E2E | Open `/unknown-route`. | Branded 404 page appears, no stack trace. |
| NAV-007 | Error boundary | E2E | Force a client/server recoverable error in test build. | `error.tsx` boundary renders useful fallback, app can recover. |
| NAV-008 | Browser refresh | E2E | Refresh dashboard with `?projectId=<id>`. | Same selected project persists and data reloads. |
| NAV-009 | Back/forward | E2E | Switch project, use browser back/forward. | URL and selected project stay in sync. |

## 3. Authentication and Signup Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| AUTH-001 | Credentials login valid | Functional | Login with `manager1@ethara.dev` / `Password@123`. | Redirects to dashboard, session cookie set. |
| AUTH-002 | Credentials login invalid password | Functional | Use valid email and wrong password. | Toast/error says invalid email or password, no redirect. |
| AUTH-003 | Credentials login invalid email format | Validation | Enter `abc` in Email and submit. | Client-side validation blocks submit. |
| AUTH-004 | Credentials login short password | Validation | Enter 7-char password. | Validation blocks submit. |
| AUTH-005 | Empty credentials | Validation | Submit blank form. | Required/validation errors visible for both fields. |
| AUTH-006 | Demo login modal open/close | UI | Click Demo login, inspect identities, close. | 2 managers and 8 members listed, modal closes cleanly. |
| AUTH-007 | Demo manager login | Functional | Demo login as Aarav Manager. | Dashboard opens with project/admin controls. |
| AUTH-008 | Demo member login | Functional | Demo login as Dev Member. | Dashboard opens without admin-only create/assign controls. |
| AUTH-009 | Google login button | Integration | Click Continue with Google. | Redirects to Google OAuth using configured client. |
| AUTH-010 | Google OAuth callback success | Integration | Complete Google OAuth with allowed test account. | User created/linked and dashboard opens. |
| AUTH-011 | Google OAuth callback failure | Integration | Cancel Google OAuth. | User returns to login with no broken state. |
| AUTH-012 | Signup valid email | Functional | Register with unique valid name, username, email, password. | Account created; if verification enabled, redirect to `/login?verify=1`; otherwise dashboard. |
| AUTH-013 | Signup duplicate email | Validation | Register using existing email. | API rejects with duplicate/user exists error. |
| AUTH-014 | Signup duplicate username | Validation | Register using existing username. | API rejects without creating duplicate user. |
| AUTH-015 | Signup invalid username | Validation | Use username with spaces or symbols. | Zod/client validation blocks. |
| AUTH-016 | Signup weak password | Validation | Use password under 8 chars. | Validation blocks. |
| AUTH-017 | Email verification valid token | Integration | Open valid `/api/auth/verify-email?token=...`. | `emailVerified` set and login allowed. |
| AUTH-018 | Email verification expired/invalid token | Security | Open invalid token. | Redirects with invalid/expired state; no account verified. |
| AUTH-019 | Logout from top menu | Functional | Open user dropdown, click Sign out. | Session removed and user returns to landing/login. |
| AUTH-020 | Session persistence | E2E | Login, close/open browser context with saved session. | Dashboard remains accessible until session expiry. |
| AUTH-021 | Session tampering | Security | Modify session/JWT cookie in browser. | Session rejected; user must login. |

## 4. Onboarding and First-Run Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| ONB-001 | New Google user first login | Functional | Sign in with new Google account. | User record exists and dashboard handles no projects gracefully. |
| ONB-002 | New credentials user first login | Functional | Register and verify new account. | User lands in dashboard with Member access. |
| ONB-003 | No project state | UX | Login as user with zero memberships. | Empty project state appears with guidance; no crash. |
| ONB-004 | Manual invite registration | Integration | Open the prefilled mail draft for an unknown email, then register using that email. | Account is created as Member; admin can add it to a project after registration. |
| ONB-005 | Unknown teammate manual invite | Functional | Admin enters an email that is not registered. | App opens a prefilled mail draft; no membership is created. |
| ONB-006 | New user after manual invite | Functional | Invited person signs up with credentials or Google. | User is created as Member until an admin adds them to a project. |

## 5. Dashboard Shell and Sidebar Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| DASH-001 | Workspace rail Home | UI | Click Home icon. | Active sprint/Kanban view displays. |
| DASH-002 | Workspace rail Tasks | UI | Click Tasks icon. | Active sprint/Kanban view displays and active state updates. |
| DASH-003 | Workspace rail Calendar | UI | Click Calendar icon. | Calendar tab displays in main content. |
| DASH-004 | Workspace rail Chat | UI | Click Chat icon. | Project chat view displays in main content. |
| DASH-005 | Workspace rail Reports | UI | Click Reports icon. | Reports panel displays status, priority, notifications. |
| DASH-006 | Workspace rail Team | UI | Click Team icon. | Add/team member dialog opens for Admin; Member gets no unauthorized admin action. |
| DASH-007 | Workspace dropdown | UI | Click Ethara Teams chevron. | Project list and logout menu appear. |
| DASH-008 | Project selection | Functional | Select another project from workspace dropdown/sidebar. | URL changes to selected project and tasks/team/chat reload. |
| DASH-009 | Selected project team dropdown | UI | Click Team next to selected project title. | Only selected project's members appear. |
| DASH-010 | Top search field | UI | Type project/task/person text. | Input accepts value; future search implementation should filter or navigate. |
| DASH-011 | Theme toggle dark/light | UI | Toggle theme twice. | Theme changes and persists without unreadable text. |
| DASH-012 | Notification count | Functional | Trigger mention/assignment notification. | Bell count increases for target user. |
| DASH-013 | User menu | UI | Open user dropdown. | Name, role, sign out action accessible. |
| DASH-014 | Responsive desktop | Visual | Test 1366x768 and 1920x1080. | No clipped cards; side panels readable. |
| DASH-015 | Responsive tablet/mobile | Visual | Test 390x844, 768x1024. | Layout remains usable; no horizontal body overflow except intended Kanban scroll. |

## 6. Project and Team Management Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| PROJ-001 | List projects | API/UI | Login and load dashboard. | Only projects where user is member are returned. |
| PROJ-002 | Create project as Global Admin | Functional | Manager creates valid project. | Project created, owner member role Admin, selected in UI. |
| PROJ-003 | Create project as Member | Security | Member calls UI/API to create project. | `403 Only admins can create projects`. |
| PROJ-004 | Project name min boundary | Validation | Submit one-character project name. | Validation rejects. |
| PROJ-005 | Project name max boundary | Validation | Submit 120 chars. | Accepted. |
| PROJ-006 | Project name over max | Validation | Submit 121 chars. | Rejected. |
| PROJ-007 | Project description max | Validation | Submit 500 chars. | Accepted. |
| PROJ-008 | Project description over max | Validation | Submit 501 chars. | Rejected. |
| PROJ-009 | Add existing member | Functional | Admin adds existing member email as MEMBER. | ProjectMember upserted and sidebar/team dropdown updates. |
| PROJ-010 | Add unknown member | Functional | Admin adds non-existing email. | UI offers a prefilled manual mail draft; no automatic invitation row is created. |
| PROJ-011 | Promote existing user to project Admin | Functional | Global Admin invites/updates user as ADMIN. | User global role and project role become Admin as designed. |
| PROJ-012 | Non-global project Admin appoints Admin | Security | Project Admin without global Admin tries ADMIN role. | `403 Only global admins can appoint admins`. |
| PROJ-013 | Duplicate add member | Integration | Add same user twice. | No duplicate ProjectMember; role updates only. |
| PROJ-014 | Invalid member email | Validation | Submit invalid email. | Validation rejects. |
| PROJ-015 | Cross-project team isolation | Security | User from Project A requests Project B members/API. | `403 Project access denied`. |
| PROJ-016 | Soft delete project | Integration | Admin deletes project via API/service. | `deletedAt` set; project hidden from lists. |
| PROJ-017 | Deleted project access | Security | Request deleted project tasks/messages. | `403` or not found; no data leaked. |
| PROJ-018 | Team count display | UI | Load multiple projects. | Each project shows its own task/member counts correctly. |

## 7. Task Creation, Assignment, and Kanban Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| TASK-001 | Create task as Admin | Functional | Open Create task, enter valid title, description, priority, assignee, due date. | Task appears in TODO with correct details and assignment notification. |
| TASK-002 | Create task as Member | Security | Member attempts via API/UI. | UI hidden and API returns `403`. |
| TASK-003 | Task title min | Validation | Submit one-character title. | Rejected. |
| TASK-004 | Task title max | Validation | Submit 160 chars. | Accepted. |
| TASK-005 | Task title over max | Validation | Submit 161 chars. | Rejected. |
| TASK-006 | Task description over max | Validation | Submit 1201 chars. | Rejected. |
| TASK-007 | Priority enum | Validation | Create with LOW/MEDIUM/HIGH/URGENT. | Each accepted and rendered with correct badge. |
| TASK-008 | Invalid priority | API | POST unknown priority. | `400` validation error. |
| TASK-009 | Due date empty | Functional | Create with no due date. | Accepted with null due date. |
| TASK-010 | Due date valid future | Functional | Create with future datetime. | Accepted and visible on task card. |
| TASK-011 | Due date invalid string | API | POST invalid datetime. | `400` validation error. |
| TASK-012 | Assign to project member | Functional | Admin assigns to a member in same project. | Task assigned and notification created. |
| TASK-013 | Assign to non-project user | Security | API assignedToId from another project. | `403 Project access denied`. |
| TASK-014 | Assign unassigned | Functional | Admin selects Unassigned. | Task assignedToId null. |
| TASK-015 | Kanban drag as Admin | E2E | Drag task TODO to IN_PROGRESS. | Optimistic UI updates, DB persists status/order after refresh. |
| TASK-016 | Kanban drag as assigned Member | E2E | Assigned member drags own task. | Status/order persists. |
| TASK-017 | Kanban drag as non-assignee Member | Security/E2E | Member drags another user's task. | UI denies or API returns `403`; status unchanged. |
| TASK-018 | Reorder within same column | E2E | Drag task lower/higher in column. | `order` persists after refresh. |
| TASK-019 | Multi-column order | Integration | Move many tasks across all statuses. | Each column order remains stable. |
| TASK-020 | Open task sheet | UI | Click Open on card. | Sheet opens with title, description, status, priority, assignee. |
| TASK-021 | Admin controls visible | RBAC | Open sheet as Admin. | Status and assignee controls visible. |
| TASK-022 | Admin controls hidden for Member | RBAC | Open sheet as Member. | Admin task controls not shown. |
| TASK-023 | Admin reassign task | Functional | Change assignee in sheet and save. | DB updates, notification created for new assignee. |
| TASK-024 | Admin status update | Functional | Change status in sheet and save. | Task status updates and analytics refresh. |
| TASK-025 | Member attempts admin-only task details update | Security | PATCH title/priority/assignee as Member. | `403 Only admins can edit task details or assignments`. |
| TASK-026 | Task soft delete | Integration | Admin deletes task via API/service. | `deletedAt` set; task hidden and analytics exclude it. |
| TASK-027 | Deleted task access | Security | Request comments/update deleted task. | `404 Task not found`. |
| TASK-028 | Overdue logic | Logic | Task dueDate past and status not DONE. | Dashboard overdue count increments. |
| TASK-029 | Done overdue exclusion | Logic | Past due task set DONE. | Overdue count excludes it. |

## 8. Task-Level Comments and Mentions Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| COMM-001 | List comments | Functional | Open task with comments. | Comments render oldest to newest. |
| COMM-002 | Empty comments | UX | Open task with no comments. | Empty state appears. |
| COMM-003 | Post valid comment | Functional | Enter text and Send comment. | Comment saved, rendered, count updates. |
| COMM-004 | Empty comment blocked | Validation | Submit whitespace-only comment. | UI does not send; API rejects empty body. |
| COMM-005 | Max comment | Validation | Submit 1200 chars. | Accepted. |
| COMM-006 | Over max comment | Validation | Submit 1201 chars. | Rejected. |
| COMM-007 | @ suggestions under 3 chars | UI | Type `@mi`. | No suggestions. |
| COMM-008 | @ suggestions after 3 chars | UI | Type `@mir`. | Matching project members suggested. |
| COMM-009 | @ insert suggestion | UI | Click suggestion. | Textarea inserts `@username` and cursor moves correctly. |
| COMM-010 | # suggestions under 3 chars | UI | Type `#ta`. | No task suggestions. |
| COMM-011 | # suggestions after 3 chars | UI | Type `#tas` or matching task slug. | Matching project tasks suggested. |
| COMM-012 | # task ref hydration | Functional | Post comment with `#task-title`. | Comment renders referenced task button. |
| COMM-013 | Referenced task click | UI | Click referenced task button. | Task sheet switches to that task. |
| COMM-014 | Mention notification | Integration | Member A mentions Member B. | Notification row created for B, not for author. |
| COMM-015 | Mention non-member | Security | Mention email/username not in project. | No notification for non-member. |
| COMM-016 | Cross-task access | Security | User comments on task in inaccessible project. | `403` via task guard. |
| COMM-017 | HTML/script in comment | Security | Post `<script>alert(1)</script>`. | Text is rendered safely, not executed. |
| COMM-018 | Realtime comment delivery | Realtime | Two browsers open same task; A comments. | B sees update without manual refresh. |

## 9. Project Chat Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| CHAT-001 | Load project chat | Functional | Open dashboard right chat panel. | Latest project messages load. |
| CHAT-002 | Empty project chat | UX | Project has no messages. | Empty state invites thread start. |
| CHAT-003 | Send valid message | Functional | Send project-wide message. | Message saved and displayed. |
| CHAT-004 | Empty message blocked | Validation | Submit whitespace-only message. | UI/API reject. |
| CHAT-005 | Max chat message | Validation | Send 1600 chars. | Accepted. |
| CHAT-006 | Over max chat message | Validation | Send 1601 chars. | Rejected. |
| CHAT-007 | Project @ suggestions after 3 chars | UI | Type `@aar`. | Project member suggestions appear. |
| CHAT-008 | Project # suggestions after 3 chars | UI | Type `#tas`. | Project task suggestions appear. |
| CHAT-009 | Project mention notification | Integration | Mention a member in project chat. | Target gets MENTION notification. |
| CHAT-010 | Project task reference | Functional | Post message with #task slug/id. | Referenced task button appears. |
| CHAT-011 | Project task ref opens task | UI | Click referenced task button. | Task sheet opens. |
| CHAT-012 | Chat tenant isolation | Security | User outside project requests `/messages`. | `403`. |
| CHAT-013 | Realtime project message | Realtime | Two users open same project; A sends message. | B sees message and notification update without refresh. |
| CHAT-014 | Message ordering | Functional | Send multiple messages. | Messages ordered by createdAt ascending. |

## 10. Calendar Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| CAL-001 | Open Calendar tab | UI | Click Calendar rail/tab. | Calendar panel with date picker, Today, New event, hourly grid appears. |
| CAL-002 | Date picker today | Functional | Click Today. | Selected date resets to current date. |
| CAL-003 | Date range load | API | GET events with from/to query. | Only current user's events in range returned. |
| CAL-004 | Create meeting | Functional | New event with title, MEETING, valid start/end, reminder. | Event saved and shown in hour slot/upcoming. |
| CAL-005 | Create reminder | Functional | Type REMINDER and reminder 10 min. | Event saved with reminderMinutes 10. |
| CAL-006 | Create focus block | Functional | Type FOCUS and location empty. | Event saved and rendered with focus tone. |
| CAL-007 | Title min boundary | Validation | Submit one-char title. | Rejected. |
| CAL-008 | Title max boundary | Validation | Submit 160 chars. | Accepted. |
| CAL-009 | End before start | Validation | Submit end <= start. | API returns `422 End time must be after start time`. |
| CAL-010 | Invalid reminder | API | Send negative or >10080 reminder. | Validation rejects. |
| CAL-011 | Complete event | Functional | Click complete icon. | Status becomes COMPLETED and UI refreshes. |
| CAL-012 | Cancel event | Functional | Click cancel icon. | Status becomes CANCELLED and UI refreshes. |
| CAL-013 | Delete event | Functional | Click delete icon. | `deletedAt` set; event disappears. |
| CAL-014 | Event ownership isolation | Security | User A requests/updates User B event ID. | `404 Calendar event not found`. |
| CAL-015 | Timezone display | Functional | Create event in local timezone. | Time displays consistently in en-IN/local browser time. |
| CAL-016 | Hourly grid overflow | UI | Add many events in same hour. | Grid remains scrollable/readable. |

## 11. Analytics and Reports Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| ANL-001 | Metrics total tasks | Integration | Count active tasks in DB for project. | Dashboard Total tasks matches DB count. |
| ANL-002 | Metrics done | Integration | Set tasks DONE. | Done metric/chart matches DB. |
| ANL-003 | Metrics in progress | Integration | Set tasks IN_PROGRESS. | In progress metric/chart matches DB. |
| ANL-004 | Overdue count | Logic | Create past due non-DONE task. | Overdue increments. |
| ANL-005 | Priority chart | Integration | Create tasks across priorities. | Priority chart distribution matches DB. |
| ANL-006 | Reports tab | UI | Click Reports tab. | Status chart, priority chart, notification panel render. |
| ANL-007 | Deleted task exclusion | Integration | Soft-delete task. | Analytics no longer count it. |
| ANL-008 | Unauthorized analytics | Security | Non-member GET analytics. | `403`. |

## 12. Notifications Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| NOTIF-001 | List notifications | Functional | Login as user with notifications. | Latest 30 notifications returned newest first. |
| NOTIF-002 | Assignment notification | Integration | Assign task to user. | ASSIGNMENT notification created with task link. |
| NOTIF-003 | Task reassignment notification | Integration | Reassign task to another user. | New assignee gets notification. |
| NOTIF-004 | Task comment mention notification | Integration | Mention member in task comment. | MENTION notification created. |
| NOTIF-005 | Project chat mention notification | Integration | Mention member in project chat. | MENTION notification created. |
| NOTIF-006 | No self mention notification | Logic | User mentions self. | No notification created for self. |
| NOTIF-007 | Mark all read | API | PATCH `/api/notifications` with read true. | Current user's notifications marked read. |
| NOTIF-008 | Mark specific IDs read | API | PATCH with selected ids. | Only owned ids updated. |
| NOTIF-009 | Cross-user read attempt | Security | User A sends User B notification IDs. | User A cannot modify User B notifications. |
| NOTIF-010 | Bell count refresh | UI/Realtme | Trigger notification. | Bell/unread count refreshes. |

## 13. Realtime and Multi-User Sync Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| RT-001 | Socket connects local | Realtime | Open dashboard in dev with custom server. | Socket connects without recurring 400s. |
| RT-002 | Socket connects production | Realtime | Open Railway app. | Socket uses production origin and connects. |
| RT-003 | Task created event | Realtime | Admin creates task while Member dashboard open. | Member dashboard task list refreshes. |
| RT-004 | Task status changed event | Realtime | User moves task. | Other browser sees updated status. |
| RT-005 | Task deleted event | Realtime | Admin soft-deletes task. | Other browser removes task. |
| RT-006 | Task comment event | Realtime | User comments in task sheet. | Other browser sees comment/count update. |
| RT-007 | Project message event | Realtime | User sends project chat message. | Other browser sees message. |
| RT-008 | Socket reconnect | Realtime | Temporarily disable network, reconnect. | App resumes syncing after reconnect. |
| RT-009 | Duplicate event handling | Realtime | Trigger same event repeatedly. | No duplicate UI rows after query invalidation. |

## 14. Database Sync and Data Integrity Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| DB-001 | Prisma migrate deploy | Deployment | Run `npm run db:deploy` against Railway DB. | Migrations apply idempotently. |
| DB-002 | Prisma generate | Build | Run `npm run db:generate`. | Client generated successfully. |
| DB-003 | Seed idempotency | Integration | Run `npm run db:seed` twice. | Demo users/projects/tasks are upserted without duplicates. |
| DB-004 | ProjectMember uniqueness | DB | Add same user to same project twice. | Unique `(projectId,userId)` prevents duplicates. |
| DB-005 | Task indexes | DB | Query project tasks by status/order. | Uses indexed fields and returns fast. |
| DB-006 | Notification ownership | DB/Security | Update notifications with userId scope. | Only current user's rows change. |
| DB-007 | Calendar soft delete | DB | Delete calendar event. | `deletedAt` set; list excludes row. |
| DB-008 | Task soft delete | DB | Delete task. | `deletedAt` set; list/analytics exclude row. |
| DB-009 | Project soft delete | DB | Delete project. | Project hidden and project guard rejects access. |
| DB-010 | Cascade account/session cleanup | DB | Delete test user in isolated DB. | Related sessions/accounts cleanup via cascade. |
| DB-011 | Assignment null on user delete | DB | Delete assigned user in isolated DB. | Task assignedToId becomes null. |
| DB-012 | Transaction safety on admin promotion | DB | Promote user to admin + membership update. | Both user role and membership update commit together. |

## 15. Security and Abuse Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| SEC-001 | Unauthenticated APIs | Security | Call all protected APIs without cookie. | `401` for each protected endpoint. |
| SEC-002 | Cross-tenant project ID | Security | Member requests projectId not joined. | `403`, no project/task/member data. |
| SEC-003 | Cross-tenant task ID | Security | Member requests task from another project. | `403` or `404`, no details leaked. |
| SEC-004 | Cross-tenant comments | Security | GET/POST comments for inaccessible task. | Rejected by task guard. |
| SEC-005 | Cross-tenant project messages | Security | GET/POST messages for inaccessible project. | `403`. |
| SEC-006 | Cross-user calendar event | Security | Update/delete another user's event. | `404`, no ownership leak. |
| SEC-007 | Member project create abuse | Security | POST `/api/projects` as Member. | `403`. |
| SEC-008 | Member task create abuse | Security | POST `/api/projects/:id/tasks` as Member. | `403`. |
| SEC-009 | Member task reassignment abuse | Security | PATCH `assignedToId` as Member. | `403`. |
| SEC-010 | Non-assignee task move abuse | Security | PATCH `status` as non-assignee Member. | `403`. |
| SEC-011 | Admin appoint rule | Security | Project Admin who is not global Admin tries to add ADMIN. | `403`. |
| SEC-012 | XSS in text fields | Security | Submit script payload in project/task/comment/chat/calendar fields. | Rendered as text; no script execution. |
| SEC-013 | SQL injection payloads | Security | Submit `'; DROP TABLE User; --` in all fields. | Stored/validated as text; DB intact. |
| SEC-014 | Oversized payload | Security | Send body much larger than field limits. | API rejects with validation error, no crash. |
| SEC-015 | CSRF-sensitive mutation | Security | Attempt cross-origin POST without session/valid cookies. | Request rejected or not authenticated. |
| SEC-016 | Cookie flags | Security | Inspect production auth cookies. | Secure/HttpOnly/SameSite settings appropriate for HTTPS. |
| SEC-017 | Sensitive env leakage | Security | Inspect browser bundle/network responses. | No secrets like `NEXTAUTH_SECRET`, DB URL, OAuth secret exposed. |
| SEC-018 | Error message leakage | Security | Trigger invalid IDs and validation failures. | No stack traces or Prisma internals returned to client. |
| SEC-019 | Rate abuse smoke | Security | Rapid POST comments/messages. | App remains stable; future rate limiting should throttle. |
| SEC-020 | ID enumeration | Security | Request random cuid-like IDs. | 403/404 only, no object metadata leaks. |

## 16. API Route Test Cases

| ID | Endpoint | Method | Positive Expected | Negative Expected |
| --- | --- | --- | --- | --- |
| API-001 | `/api/health` | GET | `200 { ok: true }` | N/A |
| API-002 | `/api/auth/register` | POST | Creates user or verification flow | 400 duplicate/invalid payload |
| API-003 | `/api/auth/verify-email` | GET | Valid token verifies email | Invalid token rejected |
| API-004 | `/api/projects` | GET | Lists user's projects | 401 unauthenticated |
| API-005 | `/api/projects` | POST | Admin creates project | 403 member, 400 invalid body |
| API-006 | `/api/projects/:projectId` | PATCH | Admin updates project | 403 non-admin/non-member |
| API-007 | `/api/projects/:projectId` | DELETE | Admin soft-deletes project | 403 non-admin |
| API-008 | `/api/projects/:projectId/members` | POST | Admin adds existing member | 403 non-admin, 404 unknown email, 400 invalid email |
| API-009 | `/api/projects/:projectId/tasks` | GET | Member lists project tasks | 403 non-member |
| API-010 | `/api/projects/:projectId/tasks` | POST | Admin creates task | 403 member, 400 invalid enum |
| API-011 | `/api/tasks/:taskId` | PATCH | Admin/assignee updates allowed fields | 403 unauthorized/admin-only changes |
| API-012 | `/api/tasks/:taskId` | DELETE | Admin soft-deletes task | 403 non-admin |
| API-013 | `/api/tasks/:taskId/comments` | GET | Member lists comments | 403 non-member |
| API-014 | `/api/tasks/:taskId/comments` | POST | Member posts comment | 400 empty/too long |
| API-015 | `/api/projects/:projectId/messages` | GET | Member lists project chat | 403 non-member |
| API-016 | `/api/projects/:projectId/messages` | POST | Member posts message | 400 empty/too long |
| API-017 | `/api/calendar-events` | GET | Lists current user's events | 401 unauthenticated |
| API-018 | `/api/calendar-events` | POST | Creates current user's event | 422 end before start |
| API-019 | `/api/calendar-events/:eventId` | PATCH | Updates owned event | 404 other user's event |
| API-020 | `/api/calendar-events/:eventId` | DELETE | Soft-deletes owned event | 404 other user's event |
| API-021 | `/api/notifications` | GET | Lists own notifications | 401 unauthenticated |
| API-022 | `/api/notifications` | PATCH | Updates own read state | Cannot update other user's rows |

## 17. Visual, Accessibility, and UX Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| UX-001 | Cyber-dark theme | Visual | Inspect desktop dashboard. | Midnight background, neon magenta accent, glass panels consistent. |
| UX-002 | Light theme | Visual | Toggle light theme. | Text contrast remains readable; panels are not washed out. |
| UX-003 | Login page polish | Visual | Open `/login` desktop/mobile. | Professional product UI, no prototype/demo-only copy except Demo login utility. |
| UX-004 | Register page polish | Visual | Open `/register` desktop/mobile. | Fields aligned, Google signup visible. |
| UX-005 | Kanban card readability | Visual | Load tasks with long titles/descriptions. | Title/description clamp cleanly and details remain visible. |
| UX-006 | Sidebar overflow | Visual | Project/team list with 12+ members. | Sidebar scrolls; no overlap. |
| UX-007 | Right chat panel | Visual | Dashboard desktop. | Project chat replaces calendar on right side. |
| UX-008 | Focus states | Accessibility | Tab through login/dashboard controls. | Visible focus ring and logical order. |
| UX-009 | Keyboard submit | Accessibility | Use Enter in forms. | Form submits once and shows pending disabled state. |
| UX-010 | Dialog escape | Accessibility | Open dialogs/sheets, press Escape. | Dialog closes and focus returns safely. |
| UX-011 | Labels and inputs | Accessibility | Inspect form labels. | Inputs have labels or accessible names. |
| UX-012 | Icon buttons | Accessibility | Inspect icon-only buttons. | Buttons have aria-label or clear accessible name. |
| UX-013 | Loading states | UX | Slow network submit forms. | Buttons disabled/spinner shown; no duplicate writes. |
| UX-014 | Toast clarity | UX | Trigger validation/API errors. | User-friendly toast/error text appears. |

## 18. PWA and Browser Capability Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| PWA-001 | Manifest | PWA | Open `/manifest.webmanifest` or browser app install audit. | Name, icons, theme color, start URL valid. |
| PWA-002 | Installability | PWA | Run Lighthouse PWA or browser install check. | App is installable where supported. |
| PWA-003 | App icon | PWA | Install app. | Ethara icon appears correctly. |
| PWA-004 | Standalone start | PWA | Launch installed app. | Opens dashboard/login according to session. |
| PWA-005 | Offline behavior | PWA | Disable network and refresh. | Clear offline/fallback behavior; no white screen. |
| PWA-006 | Cache freshness | PWA | Deploy new version, reload app. | Latest UI loads; no stale broken assets. |

## 19. Deployment and Observability Test Cases

| ID | Area | Type | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| DEP-001 | Railway build | Deployment | Push to main. | Docker build succeeds. |
| DEP-002 | Prisma generate in build | Deployment | Inspect build logs. | `npx prisma generate` runs before Next build. |
| DEP-003 | Prisma migrate deploy | Deployment | Inspect release/deploy command. | Migrations applied in production safely. |
| DEP-004 | Health check | Deployment | GET `/api/health`. | `200 {"ok":true,"service":"ethara-teams"}`. |
| DEP-005 | Required env vars | Deployment | Remove/misconfigure env in staging. | App fails safely with clear deployment error. |
| DEP-006 | Structured logs | Observability | Perform project/task/chat/calendar actions. | Logs include event names, user/project/task IDs where safe. |
| DEP-007 | No sensitive logs | Security | Inspect logs after auth/API errors. | Passwords, tokens, DB URL, secrets are not logged. |
| DEP-008 | Production OAuth callback | Deployment | Google login in production. | Callback URL matches Railway domain and login succeeds. |
| DEP-009 | Database public URL | Deployment | Local migration uses public Railway URL. | Local can connect; production uses internal where appropriate. |
| DEP-010 | WebSocket in production | Deployment | Open app in production, inspect console/network. | Socket connects without repeated 400/failed warnings. |

## 20. Automation Backlog Mapping

| Priority | Suggested Automated Coverage |
| --- | --- |
| P0 | AUTH-001 to AUTH-008, NAV-004, PROJ-001 to PROJ-003, TASK-001 to TASK-017, SEC-001 to SEC-011 |
| P1 | COMM-001 to COMM-018, CHAT-001 to CHAT-014, CAL-001 to CAL-014, ANL-001 to ANL-008 |
| P2 | UX visual screenshots, PWA installability, realtime reconnect, load/performance smoke |

## 21. Minimum Release Gate

Before client delivery, the following must pass:

1. `npm run lint`
2. `npm run test`
3. `npm run test:e2e`
4. `npm run build`
5. Railway deployment active
6. `/api/health` returns 200
7. Google OAuth works on production callback URL
8. Manager demo login works
9. Member demo login works
10. Admin can create project, add member, create/assign task
11. Member can move only assigned tasks
12. Project chat and task comments persist in DB
13. `@` and `#` suggestions appear after the third typed character
14. Mention notifications persist and display
15. Calendar event create/update/delete works for current user only
16. Cross-project and cross-user API access is rejected
17. Dashboard desktop and mobile screenshots have no clipped primary controls

## 22. Current Notes

- Browser plugin was requested for mapping; if Codex in-app browser automation is unavailable, run the same cases with Playwright against local and production URLs.
- These cases are written as the master QA catalog. Not every case is currently automated; use the Automation Backlog Mapping to decide what to automate next.
- Security cases are designed around current modular-monolith boundaries: `ensureProjectMembership`, `ensureTaskAccess`, Zod validators, Prisma ownership filters, and soft deletes.
