import { Resend } from "resend";

// Constructed lazily so a missing RESEND_API_KEY doesn't crash module
// evaluation (e.g. local dev without email configured); the key is only
// required when an email is actually sent.
let resendClient: Resend | null = null;
function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  resendClient ??= new Resend(apiKey);
  return resendClient;
}

/**
 * Sends an email from RESEND_FROM_EMAIL. Throws when Resend refuses it, which its client
 * reports as a returned error rather than a thrown one.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const { error } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "",
    to,
    subject,
    html,
  });
  if (error) throw new Error(`Resend refused the email: ${error.message}`);
}
