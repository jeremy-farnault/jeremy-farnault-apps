import { isDemoEmail } from "@jf/demo/identity";

/**
 * The daily check's recipients without the demo user. Its wishlist exists for Indexer's
 * screenshots: checking it every morning would hit the stores for nothing, and its email
 * address can't receive the digest.
 */
export function withoutDemoUser<T extends { email: string }>(recipients: T[]): T[] {
  return recipients.filter((recipient) => !isDemoEmail(recipient.email));
}
