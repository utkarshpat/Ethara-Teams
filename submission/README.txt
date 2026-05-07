Ethara Teams - Team Task Manager (Full-Stack)

Live Application URL:
https://ethara-teams-production.up.railway.app

GitHub Repository:
https://github.com/utkarshpat/Ethara-Teams

Overview:
Ethara Teams is a full-stack team task management web app where users can create projects, manage team members, assign tasks, and track progress with Admin/Member role-based access control.

Core Assignment Coverage:
- Authentication: credentials signup/login and Google OAuth through NextAuth.
- Project management: admins can create projects and manage project membership.
- Team management: admins can add existing users, promote/demote roles, and manage team access.
- Task management: admins can create, assign, update, and delete tasks; members can update allowed assigned-task status.
- Status tracking: Kanban workflow with TODO, IN_PROGRESS, REVIEW, and DONE.
- Dashboard: task status, priority distribution, overdue count, active tasks, and team summary.
- REST APIs: Next.js API route handlers for auth, projects, tasks, comments, chat, notifications, calendar, and analytics.
- Database: PostgreSQL with Prisma ORM, relational schema, indexes, migrations, and seed data.
- Validations: Zod request validation and server-side business validations.
- Role-based access: global Admin, project Admin, and Member checks on UI and API routes.
- Deployment: Railway config, Dockerfile, health check, migration deployment command.

Extra Implemented Features:
- Project chat and task comments with mentions.
- Notification system.
- Calendar events and reminders.
- Google Meet event creation support.
- Soft delete and trash restore for projects/tasks.
- PWA manifest and service worker.
- Floating AI assistant using OpenRouter for workspace questions and task/calendar actions.
- Structured logging for observability.
- Automated unit and E2E tests.

Demo Credentials:
Admin:
admin@ethara.dev
Password@123

Member:
member@ethara.dev
Password@123

Additional Demo Accounts:
manager1@ethara.dev / Password@123
manager2@ethara.dev / Password@123
member1@ethara.dev / Password@123
member2@ethara.dev / Password@123

Tech Stack:
- Next.js App Router
- React
- TypeScript
- Prisma ORM
- PostgreSQL
- NextAuth
- Socket.IO
- TanStack Query
- Zustand
- Tailwind CSS
- shadcn/ui
- Railway

Local Setup:
1. Copy .env.example to .env.
2. Fill DATABASE_URL, NEXTAUTH_SECRET, and NEXTAUTH_URL.
3. Install dependencies:
   npm install
4. Run migrations:
   npm run db:migrate
5. Seed demo data:
   npm run db:seed
6. Start development server:
   npm run dev

Verification Commands:
- npm run lint
- npm run test
- npm run test:e2e
- npm run build
- npm run db:deploy

Security and QA Notes:
- Tracked repository files were scanned for real API keys, database URLs, private keys, and provider secrets; none were found.
- .env files are ignored by git.
- RBAC and tenant boundaries are enforced server-side using Prisma ownership filters and guard functions.
- Latest QA/security audit is available in docs/qa-security-audit-2026-05-07.md.
