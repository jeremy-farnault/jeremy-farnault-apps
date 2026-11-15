// The demo account: a real user in every app, filled with made-up data, used for Indexer's
// screenshots. The seed, the screenshot capture and the scheduled jobs all read it from here.
//
// The email uses the reserved `.invalid` TLD (RFC 2606), so nothing sent to it is ever delivered.

export const DEMO_USER = {
  email: "demo@jf-apps.invalid",
  name: "Alex Morgan",
  handle: "demo",
} as const;

export function isDemoEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === DEMO_USER.email;
}
