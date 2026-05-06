# Ethara Teams

Collaborate. Execute. Scale.

Ethara Teams is a full-stack modular monolith task management and collaboration platform built with Next.js App Router, Prisma, PostgreSQL, NextAuth, self-hosted Socket.IO WebSockets, TanStack Query, Zustand, Tailwind CSS, and shadcn/ui.

## Features

- Credentials and Google authentication through NextAuth.
- Admin and Member RBAC.
- Project and team membership management.
- Project-tenant guard for task, comment, notification, and analytics access.
- Kanban board with optimistic drag-and-drop.
- Task-level realtime chat with mention notifications.
- Self-hosted WebSockets with project and task room authorization.
- Dashboard analytics for task status, priority, and overdue work.
- Soft delete support for projects and tasks.
- Installable PWA manifest and service worker.
- Docker and Railway deployment setup.

## Default Access

Use these starter credentials after running `npm run db:seed`.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@ethara.dev` | `Password@123` |
| Member | `member@ethara.dev` | `Password@123` |

Admin users can create projects, add existing users as project members, create tasks, and assign work. Member users can access assigned projects, move their own assigned tasks, and collaborate in project/task threads.

## Local Setup

1. Copy `.env.example` to `.env`.
2. Fill `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`.
3. Add Google OAuth variables when Google login is needed.
4. Add production admin Google emails to `ADMIN_EMAILS`.
5. Install dependencies:

```bash
npm install
```

6. Run migrations:

```bash
npm run db:migrate
```

7. Load the production starter workspace:

```bash
npm run db:seed
```

8. Start the app:

```bash
npm run dev
```

Starter workspace users are also listed in the Default Access section:

- Admin: `admin@ethara.dev` / `Password@123`
- Member: `member@ethara.dev` / `Password@123`

## Google Login And Roles

Google OAuth works through NextAuth. Add these values in Railway and local `.env`:

```bash
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
ADMIN_EMAILS="your-admin@gmail.com,admin@ethara.dev"
```

Google Cloud redirect URI:

```text
https://ethara-teams-production.up.railway.app/api/auth/callback/google
```

Role rules:

- Emails in `ADMIN_EMAILS` become global Admin users after Google sign-in.
- Any other new Google user becomes a Member.
- A Member must exist as a user first, then an Admin can add them to a project from the dashboard using their email.
- Existing credential users can link Google sign-in with the same email.

## Railway Deployment

1. Create a Railway project.
2. Add PostgreSQL.
3. Add the app service from GitHub.
4. Set all variables from `.env.example`.
5. Set `NEXTAUTH_URL` to the Railway public app URL.
6. Keep the pre-deploy command as `npm run db:deploy`.
7. Deploy with the included Dockerfile.

## Useful Commands

```bash
npm run lint
npm run test
npm run test:coverage
npm run test:e2e
npm run build
npm run db:format
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:seed
```

## Architecture Docs

Internal architecture and requirements live in `/docs`.

## Logs

The app emits structured JSON logs to stdout/stderr for Railway. See `/docs/observability.md` for event names and filtering guidance.
