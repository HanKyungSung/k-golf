import { Request, Response, NextFunction } from 'express';
import { getSession } from '../services/authService';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req as any).cookies?.session;
    if (!token) return res.status(401).json({ error: 'Unauthenticated' });
    const session = await getSession(token);
    if (!session) return res.status(401).json({ error: 'Unauthenticated' });
    (req as any).user = { id: session.user.id, email: session.user.email };
    (req as any).sessionToken = token;
    return next();
  } catch (e) {
    console.error('requireAuth error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = (req as any).cookies?.session;
    if (token) {
      const session = await getSession(token);
      if (session) {
        (req as any).user = { id: session.user.id, email: session.user.email };
        (req as any).sessionToken = token;
      }
    }
  } catch {}
  next();
}
