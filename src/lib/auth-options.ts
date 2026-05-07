import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { applyPendingInvitations } from "@/modules/invitations";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);

      if (!parsed.success) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });

      if (!user?.passwordHash) {
        logger.warn("auth.credentials_missing_user", { email: parsed.data.email });
        return null;
      }

      if (!user.emailVerified) {
        logger.warn("auth.credentials_unverified_email", { userId: user.id });
        throw new Error("EMAIL_NOT_VERIFIED");
      }

      const isValid = await compare(parsed.data.password, user.passwordHash);

      if (!isValid) {
        logger.warn("auth.credentials_invalid_password", { userId: user.id });
        return null;
      }

      logger.info("auth.credentials_success", { userId: user.id });
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        username: user.username,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.unshift(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email && user.id) {
        await applyPendingInvitations(user.email, user.id);
        logger.info("auth.google_success", {
          userId: user.id,
        });
      }

      return true;
    },
    async jwt({ token, user }) {
      const userId = user?.id ?? token.sub;

      if (userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, username: true },
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.username = dbUser.username;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.username = token.username;
      }

      return session;
    },
  },
  events: {
    async createUser({ user }) {
      logger.info("auth.user_created", { userId: user.id });
      const userCount = await prisma.user.count();

      if (userCount === 1) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN", emailVerified: new Date() },
        });
        logger.info("auth.user_promoted", { userId: user.id });
      }

      if (user.email) {
        await applyPendingInvitations(user.email, user.id);
      }
    },
  },
};
