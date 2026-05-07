# Ethara Teams Demo Video Script

Target length: 2-5 minutes.

## 1. Intro

"Hi, this is Ethara Teams, my full-stack Team Task Manager assignment. It is deployed on Railway and built with Next.js, Prisma, PostgreSQL, NextAuth, and role-based access control."

Show:
- Live Railway URL.
- Login page.

## 2. Authentication

"The app supports credentials login and Google OAuth. For demo, I will use seeded credentials."

Login as:
- admin@ethara.dev
- Password@123

Show:
- Successful dashboard redirect.

## 3. Dashboard And Project Overview

"The dashboard shows the selected project, active tasks, overdue count, team count, status chart, and priority distribution."

Show:
- Dashboard cards.
- Status chart.
- Priority chart.
- Responsive navigation rail.

## 4. Project And Team Management

"Admins can manage project members and roles. Members do not see admin-only actions."

Show:
- Team page.
- Add people button.
- Make admin / Make member controls.
- Admin requests section.

Mention:
"Unknown emails open a manual mail draft instead of silently creating fake access."

## 5. Task Management

"Admins can create tasks, assign them to project members, set priority and due dates, and track progress on the Kanban board."

Show:
- New task button.
- Task fields.
- Kanban statuses: TODO, IN_PROGRESS, REVIEW, DONE.
- Open task sheet.

## 6. Member RBAC

"Members have restricted access. They can collaborate and update allowed assigned work, but cannot create projects, create tasks, or manage members."

Optionally login as:
- member@ethara.dev
- Password@123

Show:
- No New project / Add people / New task controls.

## 7. Collaboration

"The app includes project chat, task comments, mentions, notifications, and realtime updates using Socket.IO."

Show:
- Chat page.
- Task comments if available.
- Notification bell.

## 8. Calendar And AI Assistant

"I also added calendar events and a floating AI assistant. The assistant can answer workspace questions and help create tasks or calendar events using OpenRouter."

Show:
- Calendar page.
- Assistant floating button.
- Ask: "How many tasks are pending?"

## 9. Closing

"This completes the required authentication, project/team management, task assignment, dashboard tracking, database relationships, validation, RBAC, and Railway deployment requirements. The repository includes README, Prisma migrations, seed data, tests, and QA/security notes."
