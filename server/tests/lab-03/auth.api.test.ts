import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword, passwordLength, validPassword } from "../../src/auth.js";

const prisma = getPrisma();
const currentPassword = "Initial Password 1";
const newPassword = "Replacement Password 1";
async function makeUser(overrides: Record<string, unknown> = {}) {
  return prisma.user.create({ data: ({ name: "Auth Test", email: `auth-${Date.now()}-${Math.random()}@example.com`, role: "REQUESTER", isActive: true, mustChangePassword: false, passwordHash: await hashPassword(currentPassword), ...overrides } as any) });
}
async function login(email: string, password = currentPassword) {
  const agent = request.agent(app); const csrf = await agent.get("/api/auth/csrf");
  const response = await agent.post("/api/auth/login").set("X-CSRF-Token", csrf.body.csrfToken).send({ email, password });
  return { agent, response, csrfToken: response.headers["x-csrf-token"] ?? csrf.body.csrfToken };
}
afterEach(() => vi.useRealTimers());

describe("Issue #18 AUTH-01 through AUTH-18", () => {
  it("AUTH-01 active login returns identity", async () => { const u = await makeUser({ mustChangePassword: true }); const r = await login(u.email); expect(r.response.status).toBe(200); expect(r.response.body.user).toMatchObject({ id: u.id, email: u.email, role: "REQUESTER", mustChangePassword: true }); });
  it("AUTH-02 invalid password is safe and unauthenticated", async () => { const u = await makeUser(); const r = await login(u.email, "wrong password"); expect(r.response.status).toBe(401); expect(r.response.body.error.code).toBe("INVALID_CREDENTIALS"); expect((await r.agent.get("/api/auth/me")).status).toBe(401); });
  it("AUTH-03 unknown account is safe", async () => { const r = await login(`unknown-${Date.now()}@example.com`); expect(r.response.status).toBe(401); expect(r.response.body.error.code).toBe("INVALID_CREDENTIALS"); });
  it("AUTH-04 inactive account is rejected", async () => { const u = await makeUser({ isActive: false }); const r = await login(u.email); expect(r.response.status).toBe(401); });
  it("AUTH-05/AUTH-17 mandatory change gates tickets but permits me", async () => { const u = await makeUser({ mustChangePassword: true }); const r = await login(u.email); expect((await r.agent.get("/api/tickets")).status).toBe(403); expect((await r.agent.get("/api/auth/me")).status).toBe(200); });
  it("AUTH-06/AUTH-13 me exposes safe fields only", async () => { const u = await makeUser(); const r = await login(u.email); const me = await r.agent.get("/api/auth/me"); expect(Object.keys(me.body.user).sort()).toEqual(["email", "id", "mustChangePassword", "name", "role"]); expect(me.body.user.passwordHash).toBeUndefined(); });
  it("AUTH-07 password change succeeds", async () => { const u = await makeUser({ mustChangePassword: true }); const r = await login(u.email); const out = await r.agent.post("/api/auth/change-password").set("X-CSRF-Token", r.csrfToken).send({ currentPassword, newPassword }); expect(out.status).toBe(200); });
  it("AUTH-08 incorrect current password fails", async () => { const u = await makeUser(); const r = await login(u.email); expect((await r.agent.post("/api/auth/change-password").set("X-CSRF-Token", r.csrfToken).send({ currentPassword: "Incorrect Password", newPassword })).status).toBe(401); });
  it.each([[11, 400], [12, 200], [128, 200], [129, 400]])("AUTH-09 password length %i", async (length, expected) => { const u = await makeUser(); const r = await login(u.email); const out = await r.agent.post("/api/auth/change-password").set("X-CSRF-Token", r.csrfToken).send({ currentPassword, newPassword: "x".repeat(length) }); expect(out.status).toBe(expected); });
  it("AUTH-09 password reuse fails", async () => { const u = await makeUser(); const r = await login(u.email); const out = await r.agent.post("/api/auth/change-password").set("X-CSRF-Token", r.csrfToken).send({ currentPassword, newPassword: currentPassword }); expect(out.status).toBe(400); expect(out.body.error.code).toBe("PASSWORD_REUSE"); });
  it("AUTH-10/AUTH-11 logout invalidates protected access", async () => { const u = await makeUser(); const r = await login(u.email); expect((await r.agent.post("/api/auth/logout").set("X-CSRF-Token", r.csrfToken)).status).toBe(204); expect((await r.agent.get("/api/auth/me")).status).toBe(401); });
  it("AUTH-14/AUTH-18 cookie is opaque and safe", async () => { const u = await makeUser(); const r = await login(u.email); const cookie = r.response.headers["set-cookie"].join(";"); const match = cookie.match(/toktickit_session=([0-9a-f]{64})/); expect(cookie).toMatch(/HttpOnly/); expect(cookie).toMatch(/SameSite=Lax/); expect(match?.[1]).toMatch(/^[0-9a-f]{64}$/); expect(cookie).not.toContain(u.email); expect(cookie).not.toContain("REQUESTER"); expect(JSON.stringify(r.response.body)).not.toContain("passwordHash"); });
  it("AUTH-15 refreshes activity and expires idle sessions", async () => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-01-01T00:00:00Z")); const u = await makeUser(); const r = await login(u.email); vi.advanceTimersByTime(7 * 60 * 60 * 1000); expect((await r.agent.get("/api/auth/me")).status).toBe(200); vi.advanceTimersByTime(8 * 60 * 60 * 1000 + 1); expect((await r.agent.get("/api/auth/me")).status).toBe(401); });
  it.each([["missing", ""], ["invalid", "bad-token"]])("AUTH-16 %s CSRF rejected", async (_label, token) => { const u = await makeUser(); const r = await login(u.email); const req = r.agent.post("/api/auth/change-password"); if (token) req.set("X-CSRF-Token", token); expect((await req.send({ currentPassword, newPassword })).status).toBe(403); });
  it("AUTH-16 old and other-session CSRF rejected", async () => { const u = await makeUser(); const a = await login(u.email); const b = await login(u.email); expect((await b.agent.post("/api/auth/change-password").set("X-CSRF-Token", a.csrfToken).send({ currentPassword, newPassword })).status).toBe(403); expect((await a.agent.post("/api/auth/change-password").set("X-CSRF-Token", b.csrfToken).send({ currentPassword, newPassword })).status).toBe(403); });
  it("AUTH-17 deactivation invalidates next request", async () => { const u = await makeUser(); const r = await login(u.email); await prisma.user.update({ where: { id: u.id }, data: { isActive: false } }); expect((await r.agent.get("/api/auth/me")).status).toBe(401); });
  it("AUTH-18 enforces Unicode password boundaries and parameterized hash format", async () => { expect(passwordLength("😀".repeat(12))).toBe(12); expect(validPassword("x".repeat(11))).toBe(false); expect(validPassword("x".repeat(12))).toBe(true); expect(validPassword("x".repeat(128))).toBe(true); expect(validPassword("x".repeat(129))).toBe(false); const hash = await hashPassword(currentPassword); expect(hash).toMatch(/^scrypt\$32768\$8\$1\$[^:]+:[0-9a-f]{128}$/); });
});
