# Ethara Teams API Contracts

## Auth
- `POST /api/auth/register`
  - Body: `{ name, username, email, password }`
  - Creates a member account with hashed password.

## Projects
- `GET /api/projects`
  - Returns projects for the current user.
- `POST /api/projects`
  - Admin-only project creation.
  - Body: `{ name, description? }`

## Tasks
- `GET /api/projects/:projectId/tasks`
  - Returns non-deleted project tasks.
- `POST /api/projects/:projectId/tasks`
  - Admin-only task creation.
  - Body: `{ title, description?, priority, dueDate?, assignedToId? }`
- `PATCH /api/tasks/:taskId`
  - Updates status, order, assignment, priority, title, description, or due date based on RBAC.
- `DELETE /api/tasks/:taskId`
  - Soft deletes a task.

## Comments
- `GET /api/tasks/:taskId/comments`
  - Returns task chat comments.
- `POST /api/tasks/:taskId/comments`
  - Body: `{ body }`
  - Creates a comment, parses mentions, creates notifications, broadcasts realtime events.

## Notifications
- `GET /api/notifications`
  - Returns current user's recent notifications.
- `PATCH /api/notifications`
  - Body: `{ ids?: string[], read?: boolean }`

## Analytics
- `GET /api/projects/:projectId/analytics`
  - Returns task status counts, priority distribution, and overdue count.

## Realtime WebSockets
- Socket endpoint: `/api/socket`
- `project:join`
  - Payload: `{ projectId }`
  - Joins `project:{projectId}` after membership validation.
- `task:join`
  - Payload: `{ taskId }`
  - Joins `task:{taskId}` after task access validation and emits presence updates.
