import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import * as prismaModule from "../../src/prisma.js";

describe("API-28: safe internal errors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a generic 500 response without datastore details", async () => {
    const technicalError = new Error(
      "PrismaClientKnownRequestError: SELECT * FROM Ticket at /srv/toktickit/server/src/routes/tickets.get.ts:42",
    );

    vi.spyOn(prismaModule, "getPrisma").mockImplementation(() => {
      throw technicalError;
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await request(app).get("/api/categories");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
    expect(response.text).not.toContain("PrismaClientKnownRequestError");
    expect(response.text).not.toContain("SELECT * FROM Ticket");
    expect(response.text).not.toContain("/srv/toktickit");
  });
});
