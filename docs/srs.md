# Ethara Teams SRS

## Functional Requirements
- Users can sign up with name, email, username, and password.
- Users can sign in with Google OAuth or credentials.
- Admin users can create projects, update project metadata, soft delete projects, and create tasks.
- Members can view projects they belong to, update assigned task status, and comment on task threads.
- Tasks support title, description, status, priority, due date, assignee, order, metadata, and soft deletion.
- Kanban drag-and-drop persists status and ordering.
- Task-level chat persists comments and broadcasts updates through self-hosted Socket.IO WebSockets.
- `@mentions` create persisted notifications and broadcast notification events.
- Dashboard analytics show task count by status, priority distribution, and overdue items.
- PWA manifest and service worker make the app installable.

## Non-Functional Requirements
- Server Components are the default rendering mode.
- Interactive surfaces use Client Components only where required.
- API input is validated with Zod.
- Database access flows through module services.
- Cross-project access is blocked by a shared project membership guard.
- PostgreSQL queries use indexes for project, assignee, task, notification, and membership lookups.
- Railway deployment supports Docker builds and Prisma migrations.

## RBAC Rules
- `ADMIN` can create and manage projects, add members, create tasks, assign tasks, and update any task in their projects.
- `MEMBER` can view joined projects, update tasks assigned to them, comment on accessible tasks, and read notifications.
- Any project-scoped read or write requires active membership in that project.
- Soft-deleted projects and tasks are hidden from normal queries.

## Acceptance Criteria
- A new user can register, sign in, and open the dashboard.
- A seeded admin can create a project and task.
- A seeded member can update an assigned task and comment on it.
- Moving a task on the Kanban board updates the UI optimistically and persists through the API.
- Mentioning a project member creates a notification with a direct task link.
- `npm run build` passes after `DATABASE_URL` is configured.
