import { scryptSync, randomBytes } from "node:crypto";
import { getPrisma } from "../src/prisma.js";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");

  const hash = scryptSync(
    password,
    salt,
    64,
    {
      N: 32768,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    },
  ).toString("hex");

  return `scrypt$32768$8$1$${salt}:${hash}`;
}

async function main() {
  const prisma = getPrisma();

  // 1. Seed Categories
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  // 2. Seed Related Systems
  const relatedSystems = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];

  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  // 3. Seed Users
  // Minimum required:
  // - 4 active Requesters
  // - 1 inactive Requester
  // - 3 active IT Staff
  // - 1 inactive IT Staff
  // - 1 active Administrator

  const users = [
    // Requesters
    {
      name: "Alice Smith",
      email: "alice.smith@example.com",
      role: "REQUESTER" as const,
      isActive: true,
    },
    {
      name: "Bob Jones",
      email: "bob.jones@example.com",
      role: "REQUESTER" as const,
      isActive: true,
    },
    {
      name: "Charlie Brown",
      email: "charlie.brown@example.com",
      role: "REQUESTER" as const,
      isActive: true,
    },
    {
      name: "Diana Prince",
      email: "diana.prince@example.com",
      role: "REQUESTER" as const,
      isActive: true,
    },
    {
      name: "Inactive User",
      email: "inactive.user@example.com",
      role: "REQUESTER" as const,
      isActive: false,
    },

    // IT Staff
    {
      name: "IT Staff One",
      email: "it.staff1@example.com",
      role: "IT_STAFF" as const,
      isActive: true,
    },
    {
      name: "IT Staff Two",
      email: "it.staff2@example.com",
      role: "IT_STAFF" as const,
      isActive: true,
    },
    {
      name: "IT Staff Three",
      email: "it.staff3@example.com",
      role: "IT_STAFF" as const,
      isActive: true,
    },
    {
      name: "Inactive IT Staff",
      email: "inactive.it@example.com",
      role: "IT_STAFF" as const,
      isActive: false,
    },

    // Administrator
    {
      name: "Admin User",
      email: "admin@example.com",
      role: "ADMINISTRATOR" as const,
      isActive: true,
    },
  ];

  const initialPassword = "ChangeMe123!";

  for (const user of users) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (!existing) {
      await prisma.user.create({ data: {
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        passwordHash: hashPassword(initialPassword),
        mustChangePassword: true,
      } });
    }
  }

  const seededRequesters = await prisma.user.findMany({ where: { role: "REQUESTER", isActive: true }, orderBy: { id: "asc" }, take: 2 });
  const seededStaff = await prisma.user.findMany({ where: { role: "IT_STAFF", isActive: true }, orderBy: { id: "asc" }, take: 2 });
  const seededCategory = await prisma.category.findFirst({ where: { isActive: true }, orderBy: { id: "asc" } });
  const seededSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true }, orderBy: { id: "asc" } });
  if (seededRequesters.length >= 2 && seededStaff.length >= 2 && seededCategory && seededSystem) {
    const queueTickets = [
      { ticketNumber: "TKT-2026-000001", requesterId: seededRequesters[0].id, summary: "Cannot access campus email", requestedPriority: "HIGH" as const, itPriority: "HIGH" as const, currentStatus: "OPEN" as const, assignedToUserId: seededStaff[0].id },
      { ticketNumber: "TKT-2026-000002", requesterId: seededRequesters[1].id, summary: "Laptop connectivity issue", requestedPriority: "MEDIUM" as const, itPriority: "MEDIUM" as const, currentStatus: "NEW" as const, assignedToUserId: null },
      { ticketNumber: "TKT-2026-000003", requesterId: seededRequesters[0].id, summary: "VPN access request", requestedPriority: "LOW" as const, itPriority: "LOW" as const, currentStatus: "IN_PROGRESS" as const, assignedToUserId: seededStaff[1].id },
      { ticketNumber: "TKT-2026-000004", requesterId: seededRequesters[1].id, summary: "Waiting for requester details", requestedPriority: "MEDIUM" as const, itPriority: "MEDIUM" as const, currentStatus: "WAITING_FOR_REQUESTER" as const, assignedToUserId: seededStaff[0].id },
      { ticketNumber: "TKT-2026-000005", requesterId: seededRequesters[0].id, summary: "Reopened service request", requestedPriority: "HIGH" as const, itPriority: "HIGH" as const, currentStatus: "REOPENED" as const, assignedToUserId: seededStaff[1].id },
      { ticketNumber: "TKT-2026-000006", requesterId: seededRequesters[1].id, summary: "Resolved software issue", requestedPriority: "LOW" as const, itPriority: "LOW" as const, currentStatus: "RESOLVED" as const, assignedToUserId: seededStaff[0].id },
      { ticketNumber: "TKT-2026-000007", requesterId: seededRequesters[0].id, summary: "Closed access request", requestedPriority: "MEDIUM" as const, itPriority: "MEDIUM" as const, currentStatus: "CLOSED" as const, assignedToUserId: seededStaff[1].id },
      { ticketNumber: "TKT-2026-000008", requesterId: seededRequesters[1].id, summary: "Cancelled duplicate request", requestedPriority: "HIGH" as const, itPriority: "HIGH" as const, currentStatus: "CANCELLED" as const, assignedToUserId: null },
    ];
    for (const ticket of queueTickets) {
      const existingTicket = await prisma.ticket.findUnique({ where: { ticketNumber: ticket.ticketNumber }, select: { id: true } });
      if (!existingTicket) {
        await prisma.ticket.create({ data: { ...ticket, categoryId: seededCategory.id, relatedSystemId: seededSystem.id, description: `${ticket.summary} requires support.` } });
      }
    }

    const seededTickets = await prisma.ticket.findMany({
      where: { ticketNumber: { in: queueTickets.map(({ ticketNumber }) => ticketNumber) } },
      orderBy: { ticketNumber: "asc" },
    });
    const publicAuthor = seededRequesters[0];
    const staffAuthor = seededStaff[0];
    const publicTicket = seededTickets.find((ticket) => ticket.ticketNumber === "TKT-2026-000001");
    const noteTicket = seededTickets.find((ticket) => ticket.ticketNumber === "TKT-2026-000003");
    if (publicTicket && noteTicket) {
      const publicBody = "I have tested the suggested solution and can access email again.";
      const noteBody = "Investigated the VPN configuration and confirmed the staff assignment.";
      if (!await prisma.publicComment.findFirst({ where: { ticketId: publicTicket.id, authorId: publicAuthor.id, body: publicBody } })) {
        await prisma.publicComment.create({ data: { ticketId: publicTicket.id, authorId: publicAuthor.id, body: publicBody } });
      }
      if (!await prisma.internalNote.findFirst({ where: { ticketId: noteTicket.id, authorId: staffAuthor.id, body: noteBody } })) {
        await prisma.internalNote.create({ data: { ticketId: noteTicket.id, authorId: staffAuthor.id, body: noteBody } });
      }
    }

    const actionFixtures = [
      {
        ticketId: seededTickets[0]?.id,
        createdById: staffAuthor.id,
        requestKey: "lab4-action-001",
        actionDescription: "Reviewed the reported email access issue.",
        result: null,
        status: "DRAFT" as const,
        followUpRequired: true,
        followUpNote: "Confirm whether the requester can sign in after the account check.",
        assignedToUserId: seededStaff[1].id,
      },
      {
        ticketId: seededTickets[1]?.id,
        createdById: staffAuthor.id,
        requestKey: "lab4-action-002",
        actionDescription: "Initial triage created for the laptop connectivity issue.",
        result: null,
        status: "DRAFT" as const,
        followUpRequired: false,
        followUpNote: null,
        assignedToUserId: null,
      },
      {
        ticketId: seededTickets[2]?.id,
        createdById: seededStaff[1].id,
        requestKey: "lab4-action-003",
        actionDescription: "Checked the VPN profile and network configuration.",
        result: "VPN settings were corrected and connectivity was restored.",
        status: "COMPLETED" as const,
        followUpRequired: false,
        followUpNote: null,
        assignedToUserId: seededStaff[1].id,
      },
      {
        ticketId: seededTickets[3]?.id,
        createdById: staffAuthor.id,
        requestKey: "lab4-action-004",
        actionDescription: "Requested additional diagnostic information from the requester.",
        result: "Requester was asked to provide the error message and device details.",
        status: "COMPLETED" as const,
        followUpRequired: true,
        followUpNote: "Review the requested details when the requester responds.",
        assignedToUserId: staffAuthor.id,
      },
      {
        ticketId: seededTickets[4]?.id,
        createdById: seededStaff[1].id,
        requestKey: "lab4-action-005",
        actionDescription: "Reopened investigation after the issue occurred again.",
        result: null,
        status: "DRAFT" as const,
        followUpRequired: true,
        followUpNote: "Retest the service after the next remediation step.",
        assignedToUserId: seededStaff[1].id,
      },
      {
        ticketId: seededTickets[5]?.id,
        createdById: staffAuthor.id,
        requestKey: "lab4-action-006",
        actionDescription: "Applied the software fix and verified the application.",
        result: "The software issue was resolved successfully.",
        status: "COMPLETED" as const,
        followUpRequired: false,
        followUpNote: null,
        assignedToUserId: staffAuthor.id,
      },
      {
        ticketId: seededTickets[6]?.id,
        createdById: seededStaff[1].id,
        requestKey: "lab4-action-007",
        actionDescription: "Verified the completed access request before closure.",
        result: "Access was confirmed and the request was closed.",
        status: "COMPLETED" as const,
        followUpRequired: false,
        followUpNote: null,
        assignedToUserId: seededStaff[1].id,
      },
      {
        ticketId: seededTickets[7]?.id,
        createdById: staffAuthor.id,
        requestKey: "lab4-action-008",
        actionDescription: "Reviewed the request and identified it as a duplicate.",
        result: "Cancelled because another Ticket already covers the same issue.",
        status: "CANCELLED" as const,
        followUpRequired: false,
        followUpNote: null,
        assignedToUserId: null,
      },
    ];
    for (const fixture of actionFixtures) {
      if (!fixture.ticketId) continue;
      const existing = await prisma.actionTaken.findUnique({
        where: { ticketId_createdById_requestKey: { ticketId: fixture.ticketId, createdById: fixture.createdById, requestKey: fixture.requestKey } },
      });
      if (!existing) {
        await prisma.actionTaken.create({ data: {
          ticketId: fixture.ticketId,
          createdById: fixture.createdById,
          requestKey: fixture.requestKey,
          actionDescription: fixture.actionDescription,
          result: fixture.result,
          status: fixture.status,
          followUpRequired: fixture.followUpRequired,
          followUpNote: fixture.followUpNote,
          assignedToUserId: fixture.assignedToUserId,
          performedById: fixture.status === "COMPLETED" ? fixture.createdById : null,
          completedAt: fixture.status === "COMPLETED" ? new Date("2026-10-01T09:00:00.000Z") : null,
        } });
      }
    }
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
