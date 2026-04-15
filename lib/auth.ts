import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getRequiredEnv } from "@/lib/env";

export function getAuthOptions(): NextAuthOptions {
  return {
    secret: getRequiredEnv("NEXTAUTH_SECRET"),
    session: {
      strategy: "jwt"
    },
    providers: [
      GoogleProvider({
        clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
        clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
        authorization: {
          params: {
            scope:
              "openid email profile https://www.googleapis.com/auth/webmasters.readonly",
            access_type: "offline",
            prompt: "consent",
            response_type: "code"
          }
        }
      })
    ],
    callbacks: {
      async jwt({ token, account }) {
        if (account?.provider === "google") {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiresAt = account.expires_at;
        }

        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.sub ?? "";
        }

        return session;
      }
    }
  };
}

export function auth() {
  return getServerSession(getAuthOptions());
}
