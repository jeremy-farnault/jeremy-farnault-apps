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
