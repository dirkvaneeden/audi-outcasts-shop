import 'server-only';

type EmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  cc?: string | null;
};

/** Sends an email through the Resend API (https://resend.com). Throws on failure. */
export async function sendEmail({ to, subject, html, text, replyTo, cc }: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error('Email is not set up: add RESEND_API_KEY and ORDER_EMAIL_FROM to .env.local.');
  }

  const bcc = process.env.ORDER_EMAIL_BCC; // optional: copy of every order to the store inbox

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      ...(bcc ? { bcc: [bcc] } : {}),
      ...(cc ? { cc: [cc] } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`The email provider returned ${res.status}: ${body.slice(0, 300)}`);
  }
}
