# Ethara Teams

Collaborate. Execute. Scale.

Ethara Teams is a full-stack modular monolith task management and collaboration platform built with Next.js App Router, Prisma, PostgreSQL, NextAuth, self-hosted Socket.IO WebSockets, TanStack Query, Zustand, Tailwind CSS, and shadcn/ui.

## Features

- Credentials and Google authentication through NextAuth.
- Admin and Member RBAC.
- Project and team membership management.
- Manual invite drafts for unknown teammates.
- Project-tenant guard for task, comment, notification, and analytics access.
- Kanban board with optimistic drag-and-drop.
- Task-level realtime chat with mention notifications.
- Self-hosted WebSockets with project and task room authorization.
- Dashboard analytics for task status, priority, and overdue work.
- Personal calendar for meetings, events, reminders, and focus blocks.
- Floating OpenRouter-powered assistant for workspace questions and task/calendar actions.
- Soft delete support for projects and tasks.
- Installable PWA manifest and service worker.
- Docker and Railway deployment setup.

## Default Access

Use these starter credentials after running `npm run db:seed`.

| Role | Email | Password |
| --- | --- | --- |
| Manager | `manager1@ethara.dev` | `Password@123` |
| Manager | `manager2@ethara.dev` | `Password@123` |
| Member | `member1@ethara.dev` | `Password@123` |
| Member | `member2@ethara.dev` | `Password@123` |
| Member | `member3@ethara.dev` | `Password@123` |
| Member | `member4@ethara.dev` | `Password@123` |
| Member | `member5@ethara.dev` | `Password@123` |
| Member | `member6@ethara.dev` | `Password@123` |
| Member | `member7@ethara.dev` | `Password@123` |
| Member | `member8@ethara.dev` | `Password@123` |

Admin users can create projects, add existing users as project members, create tasks, and assign work. Member users can access assigned projects, move their own assigned tasks, and collaborate in project/task threads.

## Local Setup

1. Copy `.env.example` to `.env`.
2. Fill `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`.
3. Add Google OAuth variables when Google login is needed.
4. Add `EMAIL_FROM` and `RESEND_API_KEY` when production email verification and admin request emails are needed.
5. Add `OPENROUTER_API_KEY` for the workspace assistant.
6. Install dependencies:

```bash
npm install
```

7. Run migrations:

```bash
npm run db:migrate
```

8. Load the production starter workspace:

```bash
npm run db:seed
```

9. Start the app:

```bash
npm run dev
```

Starter workspace users are also listed in the Default Access section. Legacy test credentials remain available after seeding:

- Admin: `admin@ethara.dev` / `Password@123`
- Member: `member@ethara.dev` / `Password@123`

## Google Login, Verification, And Roles

Google OAuth works through NextAuth. Add these values in Railway and local `.env`:

```bash
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
EMAIL_FROM="Ethara Teams <onboarding@your-domain.com>"
RESEND_API_KEY="your-resend-api-key"
OPENROUTER_API_KEY="your-openrouter-api-key"
OPENROUTER_MODEL="google/gemini-3.1-flash-lite-preview"
```

Google Cloud redirect URI:

```text
https://ethara-teams-production.up.railway.app/api/auth/callback/google
```

Role rules:

- The first registered user becomes the bootstrap global Admin.
- Seeded local/demo credentials create one Admin and one Member for testing.
- New Google users become Members.
- Credentials signup requires email verification before password login.
- Admins can add existing users by email from the Team page. If the email is not registered, the UI opens a prefilled mail draft so the admin can invite the person manually.
- Only global Admins can appoint or demote another global Admin from the Team page.
- Existing credential users can link Google sign-in with the same email.

## Railway Deployment

1. Create a Railway project.
2. Add PostgreSQL.
3. Add the app service from GitHub.
4. Set all variables from `.env.example`.
5. Set `NEXTAUTH_URL` to the Railway public app URL.
6. Keep the pre-deploy command as `npm run db:deploy && npm run db:seed`.
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
