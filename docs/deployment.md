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

## Railway Setup
1. Create a Railway project.
2. Add PostgreSQL.
3. Add a web service from the GitHub repository.
4. Add the environment variables above.
5. Set the pre-deploy command to `npm run db:deploy`.
6. Use Dockerfile deployment from the repository.
7. Generate a public domain and set `NEXTAUTH_URL` to that URL.
8. Add the production Google redirect URI: `https://your-domain/api/auth/callback/google`.

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
- Admin: `admin@ethara.dev` / `Password@123`
- Member: `member@ethara.dev` / `Password@123`
