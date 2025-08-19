// Augment Express Request with user and sessionToken added by auth middleware.
import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; email: string };
    sessionToken?: string;
  }
}
