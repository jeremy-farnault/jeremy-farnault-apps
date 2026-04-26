import { db } from "@jf/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "",
        to: user.email,
        subject: "Verify your email",
        html: `<p>Click <a href="${url}">here</a> to verify your email address.</p>`,
      });
    },
  },
  rateLimit: {
    window: 60,
    max: 10,
    customRules: {
      "/sign-up/email": { window: 3600, max: 5 },
    },
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
      ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  trustedOrigins: [
    ...(process.env.TRUSTED_ORIGINS
      ? process.env.TRUSTED_ORIGINS.split(",").map((s) => s.trim())
      : []),
    process.env.NEXT_PUBLIC_NOTER_URL ?? "http://localhost:3005",
    process.env.NEXT_PUBLIC_JOURNALER_URL ?? "http://localhost:3006",
    process.env.NEXT_PUBLIC_ROUTINER_URL ?? "http://localhost:3007",
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
