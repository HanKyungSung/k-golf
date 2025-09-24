"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAccessToken = setAccessToken;
exports.getAccessToken = getAccessToken;
exports.setAuthenticatedUser = setAuthenticatedUser;
exports.getAuthenticatedUser = getAuthenticatedUser;
exports.setSessionCookies = setSessionCookies;
exports.getSessionCookieHeader = getSessionCookieHeader;
exports.saveRefreshToken = saveRefreshToken;
exports.loadRefreshToken = loadRefreshToken;
exports.clearRefreshToken = clearRefreshToken;
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
const keytar_1 = __importDefault(require("keytar"));
const SERVICE = 'kgolf-pos';
const ACCOUNT = 'refresh-token';
let accessToken = null;
let authenticatedUser = null;
let sessionCookies = [];
/** Set (or clear) the in-memory access token. */
function setAccessToken(token) {
    accessToken = token;
}
/** Retrieve current in-memory access token (null if absent/expired). */
function getAccessToken() {
    return accessToken;
}
function setAuthenticatedUser(u) {
    authenticatedUser = u;
}
function getAuthenticatedUser() {
    return authenticatedUser;
}
function setSessionCookies(raw) {
    if (!raw)
        return;
    // Keep only name=value parts
    sessionCookies = raw.map(c => c.split(';')[0]);
}
function getSessionCookieHeader() {
    if (!sessionCookies.length)
        return null;
    return sessionCookies.join('; ');
}
/** Persist refresh token securely in OS keychain. */
async function saveRefreshToken(token) {
    await keytar_1.default.setPassword(SERVICE, ACCOUNT, token);
}
/** Load refresh token from keychain (null if missing or error). */
async function loadRefreshToken() {
    try {
        return (await keytar_1.default.getPassword(SERVICE, ACCOUNT)) || null;
    }
    catch {
        return null;
    }
}
/** Remove stored refresh token (logout flow). */
async function clearRefreshToken() {
    try {
        await keytar_1.default.deletePassword(SERVICE, ACCOUNT);
    }
    catch {
        // ignore
    }
}
