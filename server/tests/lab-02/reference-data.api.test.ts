import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
void request; void app;

describe("GET /api/requesters", () => {
  it("returns only active requesters with id, name, and email (Test API-06)", async () => {
    const res = await request(app).get("/api/requesters");
    expect(res.status).toBe(200);
    
    // Should return only 4 active requesters (1 is inactive)
    expect(res.body).toHaveLength(4);
    
    // Verify response shape and all have required fields
    for (const requester of res.body) {
      expect(requester).toHaveProperty("id");
      expect(requester).toHaveProperty("name");
      expect(requester).toHaveProperty("email");
      expect(typeof requester.id).toBe("number");
      expect(typeof requester.name).toBe("string");
      expect(typeof requester.email).toBe("string");
    }
    
    // Verify ordered by name ascending
    const names = res.body.map((r: { name: string }) => r.name);
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
    
    // Verify that inactive requesters are not included
    const inactiveEmails = res.body.map((r: { email: string }) => r.email);
    expect(inactiveEmails).not.toContain("inactive.user@example.com");
  });
});
