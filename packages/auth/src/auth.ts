import { db } from "@jf/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh if older than 1 day
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      // Set to your root domain so the session cookie is shared across all subdomains.
      // Example: if auth is auth.example.com and notes is notes.example.com, set ".example.com"
      domain: process.env.COOKIE_DOMAIN,
    },
  },
  // Uncomment to add OAuth providers:
  // socialProviders: {
  //   github: {
  //     clientId: process.env["GITHUB_CLIENT_ID"]!,
  //     clientSecret: process.env["GITHUB_CLIENT_SECRET"]!,
  //   },
  // },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
