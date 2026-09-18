import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { getPrisma } from "./prisma.js";

export const SESSION_COOKIE = "toktickit_session";
const SESSION_TTL = 8 * 60 * 60 * 1000;
type Session = { userId: number; csrfToken: string; expiresAt: number };
const sessions = new Map<string, Session>();
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

declare global { namespace Express { interface Request { auth?: { userId: number; mustChangePassword: boolean; role: string }; sessionId?: string } } }

export function passwordLength(password: string) { return [...password].length; }
export function validPassword(password: unknown) { return typeof password === "string" && passwordLength(password) >= 12 && passwordLength(password) <= 128; }
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 64, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024 }, (e, key) => e ? reject(e) : resolve(key)));
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}:${derived.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [parameters, hex] = encoded.split(":");
  const parts = parameters.startsWith("scrypt$") ? parameters.split("$") : [];
  const salt = parts.length === 5 ? parts[4] : parameters;
  const N = parts.length === 5 ? Number(parts[1]) : SCRYPT_N;
  const r = parts.length === 5 ? Number(parts[2]) : SCRYPT_R;
  const p = parts.length === 5 ? Number(parts[3]) : SCRYPT_P;
  if (!salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  if (![N, r, p].every(Number.isSafeInteger) || N <= 1 || r <= 0 || p <= 0) return false;
  const actual = await new Promise<Buffer>((resolve, reject) => scrypt(password, salt, expected.length, { N, r, p, maxmem: 64 * 1024 * 1024 }, (e, key) => e ? reject(e) : resolve(key)));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function cookies(req: Request) { return Object.fromEntries((req.header("cookie") ?? "").split(";").filter(Boolean).map(v => { const i = v.indexOf("="); return [v.slice(0, i).trim(), decodeURIComponent(v.slice(i + 1).trim())]; })); }
function secureCookie(req: Request) { return req.secure || req.header("x-forwarded-proto") === "https"; }
export function setSessionCookie(res: Response, id: string, req: Request) { res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(id)}; Path=/; HttpOnly; SameSite=Lax${secureCookie(req) ? "; Secure" : ""}`); }
export function clearSessionCookie(res: Response, req: Request) { res.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secureCookie(req) ? "; Secure" : ""}`); }
export function createSession(userId: number, req: Request, res: Response) { const id = randomBytes(32).toString("hex"); const csrfToken = randomBytes(32).toString("hex"); sessions.set(id, { userId, csrfToken, expiresAt: Date.now() + SESSION_TTL }); setSessionCookie(res, id, req); return { id, csrfToken }; }
export function ensureCsrf(req: Request, res: Response) { const found = getSession(req); if (found) return found.session.csrfToken; const id = randomBytes(32).toString("hex"); const csrfToken = randomBytes(32).toString("hex"); sessions.set(id, { userId: 0, csrfToken, expiresAt: Date.now() + SESSION_TTL }); setSessionCookie(res, id, req); return csrfToken; }
export function getSession(req: Request) { const id = cookies(req)[SESSION_COOKIE]; const session = id ? sessions.get(id) : undefined; if (!session || session.expiresAt <= Date.now()) { if (id) sessions.delete(id); return null; } session.expiresAt = Date.now() + SESSION_TTL; req.sessionId = id; return { id, session }; }
export function invalidateSession(req: Request) { const id = cookies(req)[SESSION_COOKIE]; if (id) sessions.delete(id); }
export async function attachAuth(req: Request, _res: Response, next: NextFunction) { try { const found = getSession(req); if (found && found.session.userId !== 0) { const user = await getPrisma().user.findUnique({ where: { id: found.session.userId }, select: { id: true, role: true, mustChangePassword: true, isActive: true } }); if (user?.isActive) req.auth = { userId: user.id, role: user.role, mustChangePassword: user.mustChangePassword }; else invalidateSession(req); } next(); } catch (e) { next(e); } }
export function requireAuth(req: Request, res: Response, next: NextFunction) { if (!req.auth) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }); next(); }
export function requirePasswordChanged(req: Request, res: Response) { if (req.auth?.mustChangePassword) { res.status(403).json({ error: { code: "PASSWORD_CHANGE_REQUIRED", message: "Change your password before continuing." } }); return false; } return true; }
export function requireRequester(req: Request, res: Response) {
  if (!req.auth) { res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }); return false; }
  if (req.auth.role !== "REQUESTER") { res.status(403).json({ error: { code: "FORBIDDEN", message: "Requester access required." } }); return false; }
  return requirePasswordChanged(req, res);
}
export function requireCsrf(req: Request, res: Response) { const found = getSession(req); const token = req.header("X-CSRF-Token"); if (!found || !token || token !== found.session.csrfToken) { res.status(403).json({ error: { code: "CSRF_INVALID", message: "Invalid CSRF token." } }); return false; } return true; }
export function authenticatedUserId(req: Request): number | null { return req.auth?.userId ?? null; }
export function sessionForTests() { return sessions; }
