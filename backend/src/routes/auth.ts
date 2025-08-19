import { Router } from 'express';
import { z } from 'zod';
import { createOrReuseUser, createVerificationToken, consumeVerificationToken, createSession, getSession, invalidateSession } from '../services/authService';
import { sendVerificationEmail } from '../services/emailService';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const router = Router();

const registerSchema = z.object({ email: z.string().email() });
const verifySchema = z.object({ email: z.string().email(), token: z.string().min(10) });

// POST /auth/register - idempotent
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const email = parsed.data.email.toLowerCase();
  await createOrReuseUser(email);
  const { plain, expiresAt } = await createVerificationToken(email, 'magic_link');
  try {
    await sendVerificationEmail({ to: email, email, token: plain, expiresAt });
  } catch (e) {
    console.error('sendVerificationEmail error', e);
  }
  return res.json({ ok: true }); // generic response (avoid enumeration details)
});

// POST /auth/verify
router.post('/verify', async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, token } = parsed.data;
  const consumed = await consumeVerificationToken(email.toLowerCase(), token);
  if (!consumed) return res.status(400).json({ error: 'Invalid or expired token' });
  // ensure user exists (should from register)
  let user = await createOrReuseUser(email.toLowerCase());
  if (!user.emailVerifiedAt) {
    user = await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
  }
  const { session, sessionToken } = await createSession(user.id);
  setAuthCookie(res, sessionToken);
  return res.json({ user: { id: user.id, email: user.email, emailVerifiedAt: user.emailVerifiedAt }, session: { expiresAt: session.expiresAt } });
});

// GET /auth/me
router.get('/me', async (req, res) => {
  const token = readAuthCookie(req);
  if (!token) return res.status(401).json({ error: 'Unauthenticated' });
  const session = await getSession(token);
  if (!session) return res.status(401).json({ error: 'Unauthenticated' });
  return res.json({ user: { id: session.user.id, email: session.user.email, emailVerifiedAt: (session.user as any).emailVerifiedAt } });
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  const token = readAuthCookie(req);
  if (token) await invalidateSession(token);
  clearAuthCookie(res);
  return res.json({ ok: true });
});

// --- Cookie Helpers ---
import type { Response, Request } from 'express';
const COOKIE_NAME = 'session';
function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 24 * 3600 * 1000,
  });
}
function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}
function readAuthCookie(req: Request) {
  return (req.cookies && req.cookies[COOKIE_NAME]) || null;
}

export { router as authRouter };
