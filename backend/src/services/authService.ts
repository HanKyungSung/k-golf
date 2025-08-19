import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export function generatePlainToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createOrReuseUser(email: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({ data: { email } });
}

export async function createVerificationToken(email: string, type: string, expiresMinutes = 15) {
  const plain = generatePlainToken(24);
  const tokenHash = hashToken(plain);
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
  await prisma.verificationToken.create({
    data: { identifier: email, tokenHash, type, expiresAt }
  });
  return { plain, expiresAt };
}

export async function consumeVerificationToken(email: string, plainToken: string) {
  const tokenHash = hashToken(plainToken);
  const record = await prisma.verificationToken.findFirst({
    where: { identifier: email, tokenHash, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' }
  });
  if (!record) return null;
  await prisma.verificationToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return record;
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
