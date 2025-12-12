import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export function generatePlainToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

// Password hashing (scrypt). Stored format: scrypt:N=16384,r=8,p=1:<saltB64>:<keyB64>
const SCRYPT_N = 16384; // 2^14
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const KEY_LEN = 64;

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p }, (err, buf) => {
      if (err) reject(err); else resolve(buf);
    });
  });
  return `scrypt:N=${SCRYPT_N},r=${SCRYPT_r},p=${SCRYPT_p}:${salt.toString('base64')}:${derived.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
  // Expected format: scrypt:N=16384,r=8,p=1:<saltB64>:<hashB64>
  if (!stored || !stored.startsWith('scrypt:')) return false;
  const withoutPrefix = stored.slice('scrypt:'.length);
  const segments = withoutPrefix.split(':');
  if (segments.length !== 3) return false;

  const [params, saltB64, hashB64] = segments; // params like N=...,r=...,p=1

    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');

  const paramPairs = params.split(',').reduce<Record<string, string>>((acc, kv) => {
      const [k, v] = kv.split('=');
      if (k && v) acc[k] = v;
      return acc;
    }, {});
    const N = Number.parseInt(paramPairs.N ?? `${SCRYPT_N}`, 10);
    const r = Number.parseInt(paramPairs.r ?? `${SCRYPT_r}`, 10);
    const p = Number.parseInt(paramPairs.p ?? `${SCRYPT_p}`, 10);

    const derived = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(password, salt, expected.length, { N, r, p }, (err, buf) => {
        if (err) reject(err);
        else resolve(buf);
      });
    });
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export async function createUser(email: string, name: string, phone: string, passwordHash: string, dateOfBirth?: Date) {
  return prisma.user.create({ data: { email, name, phone, dateOfBirth, passwordHash: passwordHash as any, passwordUpdatedAt: new Date() } as any });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } }) as any;
}

export async function findUserByPhone(phone: string) {
  return prisma.user.findUnique({ where: { phone } }) as any;
}

export async function createSession(userId: string, ttlHours = 24) {
  const sessionToken = generatePlainToken(24);
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
  const session = await prisma.session.create({ data: { userId, sessionToken, expiresAt } });
  return { session, sessionToken };
}

export async function getSession(token: string) {
  return prisma.session.findFirst({ where: { sessionToken: token, expiresAt: { gt: new Date() } }, include: { user: true } });
}

export async function invalidateSession(token: string) {
  await prisma.session.deleteMany({ where: { sessionToken: token } });
}

// --- Email Verification Tokens ---
function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createEmailVerificationToken(userId: string, expiresMinutes = 15) {
  // Note: Some editor setups may show a stale Prisma client type (suggesting `verificationToken`).
  // The actual model is `EmailVerificationToken` => client property `emailVerificationToken`.
  // Cast to `any` to avoid transient type noise in monorepos/hoisted installs.
  await (prisma as any).emailVerificationToken.deleteMany({ where: { userId } });
  const plain = generatePlainToken(24);
  const tokenHash = hashToken(plain);
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
  await (prisma as any).emailVerificationToken.create({ data: { userId, tokenHash, expiresAt } });
  return { plain, expiresAt };
}

export async function consumeEmailVerificationToken(userId: string, plain: string) {
  const tokenHash = hashToken(plain);
  const record = await (prisma as any).emailVerificationToken.findUnique({ where: { userId } });
  if (!record) return null;
  if (record.tokenHash !== tokenHash) return null;
  if (record.consumedAt) return null;
  if (record.expiresAt <= new Date()) return null;
  await (prisma as any).emailVerificationToken.update({ where: { userId }, data: { consumedAt: new Date() } });
  return record;
}
