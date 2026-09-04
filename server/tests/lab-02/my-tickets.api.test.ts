import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("My Tickets API", () => {
  const prisma = getPrisma();

  let requesterAId: number;
  let requesterBId: number;
  let categoryId: number;
  let relatedSystemId: number;

  beforeEach(async () => {
    // Clear data to avoid conflicts with other tests
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.requesterUser.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.relatedSystem.deleteMany({});

    // Create reference data required by Ticket
    const category = await prisma.category.create({
      data: {
        name: "Hardware",
        isActive: true,
      },
    });

    const relatedSystem = await prisma.relatedSystem.create({
      data: {
        name: "Campus Wi-Fi",
        isActive: true,
      },
    });

    categoryId = category.id;
    relatedSystemId = relatedSystem.id;

    // Create two active requesters
    const requesterA = await prisma.requesterUser.create({
      data: {
        name: "Requester A",
        email: "requesterA@example.com",
        isActive: true,
      },
    });

    const requesterB = await prisma.requesterUser.create({
      data: {
        name: "Requester B",
        email: "requesterB@example.com",
        isActive: true,
      },
    });

    requesterAId = requesterA.id;
    requesterBId = requesterB.id;
  });

  async function createTicket(
    requesterId: number,
    ticketNumber: string,
    summary: string
  ) {
    return prisma.ticket.create({
      data: {
        ticketNumber,
        requesterId,
        categoryId,
        relatedSystemId,
        summary,
        description:
          "This is a test ticket description for My Tickets API.",
        requestedPriority: "MEDIUM",
        currentStatus: "NEW",
      },
    });
  }

  it("API-09: should return only current requester's tickets", async () => {
    await createTicket(
      requesterAId,
      "TKT-2026-000001",
      "A cannot connect to Wi-Fi"
    );

    await createTicket(
      requesterBId,
      "TKT-2026-000002",
      "B cannot access email"
    );

    const res = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);

    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("meta");

    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.pageSize).toBe(10);
    expect(res.body.meta.totalItems).toBe(1);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].ticketNumber).toBe(
      "TKT-2026-000001"
    );
  });

  it("API-10: should isolate tickets between requesters", async () => {
    await createTicket(
      requesterAId,
      "TKT-2026-000003",
      "A private ticket"
    );

    await createTicket(
      requesterBId,
      "TKT-2026-000004",
      "B private ticket"
    );

    const res = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterBId));

    expect(res.status).toBe(200);

    expect(
      res.body.data.some(
        (ticket: { ticketNumber: string }) =>
          ticket.ticketNumber === "TKT-2026-000003"
      )
    ).toBe(false);

    expect(res.body.data[0].ticketNumber).toBe(
      "TKT-2026-000004"
    );
  });

  it("API-11: should search tickets by summary or ticket number case-insensitively", async () => {
    await createTicket(
      requesterAId,
      "TKT-2026-000005",
      "Cannot connect to Campus WiFi"
    );

    await createTicket(
      requesterAId,
      "TKT-2026-000006",
      "Printer is not working"
    );

    // Search by summary
    const summaryRes = await request(app)
      .get("/api/tickets")
      .query({ search: "CAMPUS WIFI" })
      .set("X-Requester-Id", String(requesterAId));

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.meta.totalItems).toBe(1);
    expect(summaryRes.body.data[0].ticketNumber).toBe(
      "TKT-2026-000005"
    );

    // Search by ticket number
    const ticketNumberRes = await request(app)
      .get("/api/tickets")
      .query({ search: "000006" })
      .set("X-Requester-Id", String(requesterAId));

    expect(ticketNumberRes.status).toBe(200);
    expect(ticketNumberRes.body.meta.totalItems).toBe(1);
    expect(ticketNumberRes.body.data[0].ticketNumber).toBe(
      "TKT-2026-000006"
    );
  });

  it("API-12: should return empty data when there are no matches", async () => {
    await createTicket(
      requesterAId,
      "TKT-2026-000007",
      "Laptop cannot start"
    );

    const res = await request(app)
      .get("/api/tickets")
      .query({
        search: "something-that-does-not-exist",
      })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);

    expect(res.body.data).toEqual([]);
    expect(res.body.meta.totalItems).toBe(0);
    expect(res.body.meta.totalPages).toBe(0);
  });

  it("API-13: should paginate tickets correctly", async () => {
    // Create 11 tickets so page 2 contains the next ticket
    for (let i = 1; i <= 11; i++) {
      await createTicket(
        requesterAId,
        `TKT-2026-${String(i).padStart(6, "0")}`,
        `Test ticket number ${i}`
      );
    }

    const page1 = await request(app)
      .get("/api/tickets")
      .query({
        page: 1,
        pageSize: 10,
      })
      .set("X-Requester-Id", String(requesterAId));

    const page2 = await request(app)
      .get("/api/tickets")
      .query({
        page: 2,
        pageSize: 10,
      })
      .set("X-Requester-Id", String(requesterAId));

    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);

    expect(page1.body.data).toHaveLength(10);
    expect(page2.body.data).toHaveLength(1);

    expect(page1.body.meta.page).toBe(1);
    expect(page2.body.meta.page).toBe(2);

    expect(page1.body.meta.totalItems).toBe(11);
    expect(page2.body.meta.totalItems).toBe(11);

    const page1Ids = page1.body.data.map(
      (ticket: { id: number }) => ticket.id
    );

    const page2Ids = page2.body.data.map(
      (ticket: { id: number }) => ticket.id
    );

    expect(page1Ids).not.toEqual(
      expect.arrayContaining(page2Ids)
    );
  });

  it("API-14: should sort tickets correctly", async () => {
    await createTicket(
      requesterAId,
      "TKT-2026-000010",
      "Ticket C"
    );

    await createTicket(
      requesterAId,
      "TKT-2026-000008",
      "Ticket A"
    );

    await createTicket(
      requesterAId,
      "TKT-2026-000009",
      "Ticket B"
    );

    const res = await request(app)
      .get("/api/tickets")
      .query({
        sortBy: "ticketNumber",
        sortOrder: "asc",
      })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);

    const ticketNumbers = res.body.data.map(
      (ticket: { ticketNumber: string }) => ticket.ticketNumber
    );

    expect(ticketNumbers).toEqual([
      "TKT-2026-000008",
      "TKT-2026-000009",
      "TKT-2026-000010",
    ]);
  });

  it("API-15: should reject invalid query parameters", async () => {
    const invalidQueries = [
      { pageSize: 999 },
      { page: 0 },
      { sortBy: "foo" },
    ];

    for (const query of invalidQueries) {
      const res = await request(app)
        .get("/api/tickets")
        .query(query)
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY");
    }
  });

  it("API-29: should support currentStatus=NEW and reject unsupported statuses", async () => {
    await createTicket(
      requesterAId,
      "TKT-2026-000011",
      "New ticket"
    );

    const newStatusRes = await request(app)
      .get("/api/tickets")
      .query({ currentStatus: "NEW" })
      .set("X-Requester-Id", String(requesterAId));

    expect(newStatusRes.status).toBe(200);
    expect(newStatusRes.body.meta.totalItems).toBe(1);
    expect(newStatusRes.body.data[0].currentStatus).toBe("NEW");

    const invalidStatusRes = await request(app)
      .get("/api/tickets")
      .query({ currentStatus: "CLOSED" })
      .set("X-Requester-Id", String(requesterAId));

    expect(invalidStatusRes.status).toBe(400);
    expect(invalidStatusRes.body.error.code).toBe("INVALID_QUERY");
  });
});