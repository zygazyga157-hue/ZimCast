import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { publicUrlForKey } from "@/lib/media-storage";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user) return null;

          const isValid = await compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) return null;

          // Track last login
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: user.emailVerified,
            avatarUrl: publicUrlForKey(user.avatarKey),
          };
        } catch (err) {
          console.error('[auth][error] Credentials authorize failed:', err);
          // Return null to indicate failed sign-in without exposing details to client
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.emailVerified = (user as { emailVerified: boolean }).emailVerified;
        token.avatarUrl = (user as { avatarUrl?: string | null }).avatarUrl ?? null;
      }
      // Refresh emailVerified + avatarUrl on session update trigger
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { emailVerified: true, avatarKey: true },
        });
        if (dbUser) {
          token.emailVerified = dbUser.emailVerified;
          token.avatarUrl = publicUrlForKey(dbUser.avatarKey);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
        (session.user as { emailVerified: boolean }).emailVerified = token.emailVerified as boolean;
        (session.user as { avatarUrl?: string | null }).avatarUrl = (token.avatarUrl as string | null) ?? null;
      }
      return session;
    },
  },
});
