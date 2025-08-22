import nodemailer from 'nodemailer';

export interface VerificationEmailParams {
  to: string;
  token: string;
  expiresAt: Date;
  email: string; // explicit duplicate
}

let cachedTransport: nodemailer.Transporter | null = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn('[email] Missing GMAIL_USER/GMAIL_APP_PASSWORD; logging emails only.');
    return null;
  }
  cachedTransport = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  return cachedTransport;
}

export async function sendVerificationEmail({ to, token, expiresAt, email }: VerificationEmailParams) {
  // Always point verification links to the FRONTEND app
  const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  // Frontend page will handle POST /api/auth/verify
  const link = `${origin.replace(/\/$/, '')}/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  const subject = 'Your K-Golf sign-in link';
  const text = `Sign in: ${link}\n\nExpires: ${expiresAt.toISOString()}\nIf you did not request this, ignore.`;
  const html = `<!doctype html><html><body style=\"font-family:system-ui,sans-serif\"><h2>K-Golf Sign-In</h2><p>Click the button below to sign in. Expires in 15 minutes.</p><p><a href=\"${link}\" style=\"display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px\">Verify & Sign In</a></p><p style=\"font-size:12px;color:#555\">If the button doesn't work, use this URL:<br>${link}</p></body></html>`;
  const transport = getTransport();
  if (!transport) {
    console.log(`[email:dev-log] to=${to} token=${token} link=${link}`);
    return;
  }
  await transport.sendMail({ from: `K-Golf Auth <${process.env.GMAIL_USER}>`, to, subject, text, html });
}
