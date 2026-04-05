import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      emailVerified: boolean;
      avatarUrl?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    emailVerified: boolean;
    avatarUrl?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    emailVerified: boolean;
    avatarUrl?: string | null;
  }
}
