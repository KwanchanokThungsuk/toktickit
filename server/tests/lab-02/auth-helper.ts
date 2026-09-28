import request from "supertest";
import { app } from "../../src/app.js";

export async function authenticatedAgent(email: string, password: string) {
  const agent = request.agent(app);
  const csrf = await agent.get("/api/auth/csrf");
  if (csrf.status !== 200) throw new Error(`CSRF setup failed: ${csrf.status}`);
  const login = await agent.post("/api/auth/login").set("X-CSRF-Token", csrf.body.csrfToken).send({ email, password });
  if (login.status !== 200) throw new Error(`Login failed: ${login.status}`);
  return { agent, csrfToken: login.headers["x-csrf-token"] ?? csrf.body.csrfToken };
}

export function csrfHeaders(csrfToken: string) { return { "X-CSRF-Token": csrfToken }; }
