# Ethara Teams System Design

## Architecture Style
Ethara Teams uses a modular monolith architecture. The app ships as one Next.js deployment and uses one PostgreSQL database, while domain code is isolated into internal modules with explicit public APIs.

## Runtime Components
- Next.js App Router for Server Components, pages, layouts, route handlers, and server actions.
- Prisma ORM for relational persistence.
- NextAuth v4 for session management, Google OAuth, and credential login.
- Self-hosted Socket.IO WebSockets for realtime task chat, project updates, notifications, and presence.
- TanStack Query for client-side server state.
- Zustand for local UI state such as selected project/task and command surfaces.
- Tailwind CSS and shadcn/ui for the product interface.

## Module Boundaries
- `auth`: session lookup, credentials validation, registration, RBAC helpers.
- `users`: user lookup and mentionable team member queries.
- `projects`: project creation, membership, admin checks, project listing.
- `tasks`: task CRUD, Kanban ordering, status changes, soft deletion.
- `comments`: task-level chat and mention parsing.
- `notifications`: persisted notification reads and realtime fanout.
- `analytics`: dashboard summaries built from task data.

## Internal API Rules
- Module internals are not imported directly across domains.
- `src/modules/<module>/index.ts` exposes stable module APIs.
- `services` contain Prisma-backed business logic.
- `actions.ts` contains frontend-facing Server Action wrappers only.
- Route handlers authenticate, validate, call services, and return JSON.

## Task-Level Chat Design
Each task has a dedicated comment thread persisted in PostgreSQL. Posting a comment validates project membership, saves the comment, extracts mentions, creates notifications, and broadcasts a Socket.IO event to the authorized task room.

## Tenant Guard
Every project-scoped service calls the shared guard before returning data or mutating rows. The guard verifies that the authenticated user is an active member of the requested project and optionally checks role requirements.

## WebSocket Rooms
- `project:{projectId}`: project-wide task updates and notification events.
- `task:{taskId}`: task chat and currently-viewing presence.
- Socket connections authenticate with the existing NextAuth session cookie.
- Join events re-check project or task access before the socket enters a room.

## Deployment
The app deploys as a Dockerized custom Next.js server on Railway. PostgreSQL is attached as a Railway database service. Prisma generation occurs during build, migrations run through Railway pre-deploy command, and Socket.IO runs on the same app service through `/api/socket`.
