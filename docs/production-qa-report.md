# Ethara Teams Production QA Run

Run at: 2026-05-06T22:32:20.479Z
Target: https://ethara-teams-production.up.railway.app

## Summary

- Total checks: 36
- Passed: 34
- Failed: 2
- Browser plugin: unavailable in this Codex session, Playwright fallback used.

## Findings

### High: 2 production smoke checks failed

Evidence:

```
PROJ-004/API-005: invalid project name -> 422
TASK-003/TASK-008: invalid task -> 422
```

Recommendation: Fix failed production flows before client handoff.

## Check Results

| ID | Area | Status | Details |
| --- | --- | --- | --- |
| DEP-004 | public/deployment | PASS | /api/health -> 200 |
| NAV-001 | public/deployment | PASS | / -> 200 |
| NAV-002 | public/deployment | PASS | /login -> 200 |
| NAV-003 | public/deployment | PASS | /register -> 200 |
| SEC-001/API-004 | unauth-api-security | PASS | /api/projects -> 401 |
| SEC-001/API-017 | unauth-api-security | PASS | /api/calendar-events -> 401 |
| SEC-001/API-021 | unauth-api-security | PASS | /api/notifications -> 401 |
| NAV-004 | auth-guard | PASS | url=https://ethara-teams-production.up.railway.app/login |
| AUTH-001/AUTH-007 | auth | PASS | manager1 credentials session created |
| AUTH-001/AUTH-008 | auth | PASS | member1 credentials session created |
| PROJ-001/API-004 | projects-api | PASS | projects=1 |
| TASK-API-009 | tasks-api | PASS | tasks=5 |
| ANL-001/API-analytics | analytics-api | PASS | status=200 total=5 |
| PROJ-003/SEC-007/API-005 | rbac-security | PASS | member project create -> 403 |
| TASK-002/SEC-008/API-010 | rbac-security | PASS | member task create -> 403 |
| PROJ-004/API-005 | validation | FAIL | invalid project name -> 422 |
| PROJ-002/API-005 | project-create-db-sync | PASS | status=201 id=cmoumv0u40001k00p93bthsux |
| PROJ-009/API-008 | member-upsert | PASS | status=201 |
| TASK-001/API-010 | task-create-db-sync | PASS | status=201 id=cmoumv28l0007k00pybzip15w |
| TASK-024/API-011 | task-update-db-sync | PASS | status=200 |
| TASK-003/TASK-008 | task-validation | FAIL | invalid task -> 422 |
| CHAT-003/CHAT-009/CHAT-010/API-016 | project-chat-db-sync | PASS | status=201 |
| COMM-003/COMM-014/API-014 | comments-db-sync | PASS | status=201 |
| CAL-004/API-018 | calendar-create-db-sync | PASS | status=201 id=cmoumv4dp000hk00pq1uollrm |
| CAL-007/CAL-009 | calendar-validation | PASS | invalid calendar -> 422 |
| CAL-011/API-019 | calendar-update | PASS | status=200 |
| CAL-013/API-020 | calendar-soft-delete | PASS | status=200 |
| NAV-005/DASH-overview | dashboard-route-ui | PASS | /dashboard?projectId=seed-project-ethara contains Project overview; url=https://ethara-teams-production.up.railway.app/dashboard?projectId=seed-project-ethara |
| DASH-002 | dashboard-route-ui | PASS | /dashboard/tasks?projectId=seed-project-ethara contains Active sprint; url=https://ethara-teams-production.up.railway.app/dashboard/tasks?projectId=seed-project-ethara |
| DASH-003/CAL-001 | dashboard-route-ui | PASS | /dashboard/calendar?projectId=seed-project-ethara contains Calendar; url=https://ethara-teams-production.up.railway.app/dashboard/calendar?projectId=seed-project-ethara |
| DASH-004/CHAT-001 | dashboard-route-ui | PASS | /dashboard/chat?projectId=seed-project-ethara contains Project chat; url=https://ethara-teams-production.up.railway.app/dashboard/chat?projectId=seed-project-ethara |
| DASH-005/ANL-006 | dashboard-route-ui | PASS | /dashboard/reports?projectId=seed-project-ethara contains Status; url=https://ethara-teams-production.up.railway.app/dashboard/reports?projectId=seed-project-ethara |
| DASH-006 | dashboard-route-ui | PASS | /dashboard/team?projectId=seed-project-ethara contains Project team; url=https://ethara-teams-production.up.railway.app/dashboard/team?projectId=seed-project-ethara |
| TASK-021 | admin-ui-rbac | PASS | admin New task visible |
| TASK-022/member-ui-rbac | member-ui-rbac | PASS | member New task hidden |
| PROJ-016/cleanup | cleanup | PASS | soft delete QA project -> 200 |

## Created Test Data

```json
{
  "selectedProjectId": "seed-project-ethara",
  "qaProjectId": "cmoumv0u40001k00p93bthsux",
  "qaTaskId": "cmoumv28l0007k00pybzip15w",
  "calendarId": "cmoumv4dp000hk00pq1uollrm"
}
```

## Screenshots

- test-results/prod-dashboard-admin.png
- test-results/prod-dashboard-member.png
