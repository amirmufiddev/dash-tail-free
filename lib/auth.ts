import type { AuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { user } from "@/app/api/user/data";
import bcrypt from "bcrypt";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
    GithubProvider({
      clientId: process.env.AUTH_GITHUB_ID ?? "",
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? "",
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }
        const foundUser = user.find((u) => u.email === credentials.email);

        if (!foundUser) {
          throw new Error("User not found");
        }

        //  check correctPassword plain without bcrypt
        const correctPassword = credentials.password === foundUser.password;

        if (!correctPassword) {
          throw new Error("Invalid password");
        }

        return {
          ...foundUser,
          id: String(foundUser.id),
          image:
            typeof foundUser.image === "string"
              ? foundUser.image
              : foundUser.image?.src,
        };
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      const domain = process.env.ALLOWED_DOMAIN ?? "";
      const email = user.email ?? "";
      if (domain && !email.endsWith(domain)) {
        throw new Error("You are not allowed to access this platform");
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.role) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt" as const,
  },
  debug: process.env.NODE_ENV !== "production",
};
