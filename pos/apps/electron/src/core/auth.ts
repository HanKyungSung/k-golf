/**
 * auth.ts
 * -----------------------------------------
 * In-process auth token management.
 *  - Access token (short-lived) kept only in memory (volatile, cleared on app restart)
 *  - Refresh token (longer-lived) stored securely using OS keychain via keytar
 *
 * This separation reduces risk of token exfiltration from renderer process.
 * Renderer should request privileged operations via IPC; only the main process
 * touches refresh token. (IPC glue will be added in a later phase.)
 */
import keytar from 'keytar';

const SERVICE = 'kgolf-pos';
const ACCOUNT = 'refresh-token';

let accessToken: string | null = null;
let authenticatedUser: { id: string; email: string; name?: string | null; role?: string } | null = null;
let sessionCookies: string[] = [];

/** Set (or clear) the in-memory access token. */
export function setAccessToken(token: string | null) {
  accessToken = token;
}
/** Retrieve current in-memory access token (null if absent/expired). */
export function getAccessToken() {
  return accessToken;
}

export function setAuthenticatedUser(u: { id: string; email: string; name?: string | null; role?: string } | null) {
  authenticatedUser = u;
}

export function getAuthenticatedUser() {
  return authenticatedUser;
}

export function setSessionCookies(raw: string[] | undefined) {
  if (!raw) return;
  // Keep only name=value parts
  sessionCookies = raw.map(c => c.split(';')[0]);
}

export function getSessionCookieHeader(): string | null {
  if (!sessionCookies.length) return null;
  return sessionCookies.join('; ');
}

/** Persist refresh token securely in OS keychain. */
export async function saveRefreshToken(token: string) {
  await keytar.setPassword(SERVICE, ACCOUNT, token);
}

/** Load refresh token from keychain (null if missing or error). */
export async function loadRefreshToken(): Promise<string | null> {
  try {
    return (await keytar.getPassword(SERVICE, ACCOUNT)) || null;
  } catch {
    return null;
  }
}

/** Remove stored refresh token (logout flow). */
export async function clearRefreshToken() {
  try {
    await keytar.deletePassword(SERVICE, ACCOUNT);
  } catch {
    // ignore
  }
}
