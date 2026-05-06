# Railway Deployment Guide

## Required Services
- Railway Web Service for the Next.js app.
- Railway PostgreSQL database.
- Google OAuth client for production login.

## Environment Variables
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `EMAIL_FROM`
- `RESEND_API_KEY`

## Railway Setup
1. Create a Railway project.
2. Add PostgreSQL.
3. Add a web service from the GitHub repository.
4. Add the environment variables above.
5. Set the pre-deploy command to `npm run db:deploy && npm run db:seed`.
6. Use Dockerfile deployment from the repository.
7. Generate a public domain and set `NEXTAUTH_URL` to that URL.
8. Add the production Google redirect URI: `https://your-domain/api/auth/callback/google`.
9. Configure `EMAIL_FROM` and `RESEND_API_KEY` for email verification and invite delivery.

## Realtime
Realtime chat and notifications use self-hosted Socket.IO on the same Railway web service. No external realtime provider is required. The server listens on `/api/socket` and authenticates sockets with the NextAuth session cookie.

## Local Setup
1. Copy `.env.example` to `.env`.
2. Fill `DATABASE_URL` with a local or Railway Postgres URL.
3. Run `npm install`.
4. Run `npm run db:migrate`.
5. Run `npm run db:seed`.
6. Run `npm run dev`.

## Starter Workspace Users
- Manager: `manager1@ethara.dev` / `Password@123`
- Manager: `manager2@ethara.dev` / `Password@123`
- Member: `member1@ethara.dev` / `Password@123`
- Member: `member2@ethara.dev` / `Password@123`
- Member: `member3@ethara.dev` / `Password@123`
- Member: `member4@ethara.dev` / `Password@123`
- Member: `member5@ethara.dev` / `Password@123`
- Member: `member6@ethara.dev` / `Password@123`
- Member: `member7@ethara.dev` / `Password@123`
- Member: `member8@ethara.dev` / `Password@123`

## Admin And Member Creation
- The first registered credentials user becomes Admin automatically.
- Seeded workspaces include one Admin and one Member for local verification.
- Other Google users are created as Members unless a pending invitation appoints them as Admin.
- Credentials signup requires email verification before password login.
- Admins invite users to projects from the dashboard by email.
- If the invited user already exists, project membership is applied immediately.
- If the invited user does not exist, the invitation is applied when they sign up or sign in with Google using the invited email.
- Only global Admins can appoint another Admin.
