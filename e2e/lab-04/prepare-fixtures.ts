import { randomBytes, scryptSync } from "node:crypto";
import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { PrismaClient } from "../../server/node_modules/@prisma/client/index.js";

const fixturePath = "/tmp/toktickit-lab4-e2e-fixtures.json";
const password = "ChangeMe123!";

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync("server/.env", "utf8");
  const match = env.match(/^DATABASE_URL=\"?([^\"\n]+)\"?/m);
  if (!match) throw new Error("E2E setup requires DATABASE_URL");
  return match[1];
}

function passwordHash(value: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  }).toString("hex");
  return `scrypt$32768$8$1$${salt}:${hash}`;
}

export type Lab4Fixtures = {
  requesterTicketId: number;
  staffTicketId: number;
  administratorTicketId: number;
  responsiveTicketId: number;
  accessibilityRequesterTicketId: number;
  accessibilityWorkflowTicketId: number;
};

export const responsiveTicketDescription = "Responsive fixture description: this deliberately long, deterministic Lab 4 ticket description proves that operational Ticket Detail content wraps cleanly without forcing horizontal page overflow at every required viewport.";
export const responsiveActionDescription = "Responsive fixture Action: this deliberately long, deterministic Actions Taken description proves that shared work details wrap and remain reachable in both the desktop table and the tablet/mobile card presentation.";

export function lab4Fixtures(): Lab4Fixtures {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as Lab4Fixtures;
}

export default async function prepareLab4Fixtures() {
  const url = databaseUrl();
  const database = new URL(url).pathname.replace(/^\//, "");
  if (!database || database === "toktickit" || database === "postgres") {
    throw new Error(`Refusing Lab 4 E2E setup for unsafe database: ${database || "unknown"}`);
  }

  process.env.DATABASE_URL = url;
  const prisma = new PrismaClient();
  try {
    const accounts = await Promise.all([
      prisma.user.upsert({
        where: { email: "e2e.lab4.requester@example.com" },
        update: { name: "E2E Lab 4 Requester", role: "REQUESTER", isActive: true, mustChangePassword: false, passwordHash: passwordHash(password) },
        create: { email: "e2e.lab4.requester@example.com", name: "E2E Lab 4 Requester", role: "REQUESTER", isActive: true, mustChangePassword: false, passwordHash: passwordHash(password) },
      }),
      prisma.user.upsert({
        where: { email: "e2e.lab4.staff@example.com" },
        update: { name: "E2E Lab 4 IT Staff", role: "IT_STAFF", isActive: true, mustChangePassword: false, passwordHash: passwordHash(password) },
        create: { email: "e2e.lab4.staff@example.com", name: "E2E Lab 4 IT Staff", role: "IT_STAFF", isActive: true, mustChangePassword: false, passwordHash: passwordHash(password) },
      }),
      prisma.user.upsert({
        where: { email: "e2e.lab4.admin@example.com" },
        update: { name: "E2E Lab 4 Administrator", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, passwordHash: passwordHash(password) },
        create: { email: "e2e.lab4.admin@example.com", name: "E2E Lab 4 Administrator", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, passwordHash: passwordHash(password) },
      }),
      prisma.user.upsert({
        where: { email: "e2e.lab4.password-change@example.com" },
        update: { name: "E2E Lab 4 Password Change", role: "REQUESTER", isActive: true, mustChangePassword: true, passwordHash: passwordHash(password) },
        create: { email: "e2e.lab4.password-change@example.com", name: "E2E Lab 4 Password Change", role: "REQUESTER", isActive: true, mustChangePassword: true, passwordHash: passwordHash(password) },
      }),
    ]);
    const [requester, staff, administrator] = accounts;
    const category = await prisma.category.upsert({ where: { name: "E2E Lab 4 Support" }, update: { isActive: true }, create: { name: "E2E Lab 4 Support", isActive: true } });
    const relatedSystem = await prisma.relatedSystem.upsert({ where: { name: "E2E Lab 4 Platform" }, update: { isActive: true }, create: { name: "E2E Lab 4 Platform", isActive: true } });
    const ticketNumbers = ["E2E-L4-REQUESTER", "E2E-L4-STAFF", "E2E-L4-ADMIN", "E2E-L4-RESPONSIVE", "E2E-L4-A11Y-REQUESTER", "E2E-L4-A11Y-WORKFLOW"];
    const existing = await prisma.ticket.findMany({ where: { ticketNumber: { in: ticketNumbers } }, select: { id: true } });
    if (existing.length) await prisma.actionTaken.deleteMany({ where: { ticketId: { in: existing.map((ticket) => ticket.id) } } });

    const common = { categoryId: category.id, relatedSystemId: relatedSystem.id, description: "Dedicated Lab 4 browser-test fixture. Do not use for manual work.", requestedPriority: "MEDIUM" as const, itPriority: "MEDIUM" as const };
    const requesterTicket = await prisma.ticket.upsert({
      where: { ticketNumber: "E2E-L4-REQUESTER" },
      update: { ...common, requesterId: requester.id, assignedToUserId: staff.id, summary: "Lab 4 requester dashboard fixture", currentStatus: "WAITING_FOR_REQUESTER", resolvedAt: null, requesterResolutionIndicatedAt: null, requesterResolutionIndicatedByUserId: null, version: 1 },
      create: { ...common, ticketNumber: "E2E-L4-REQUESTER", requesterId: requester.id, assignedToUserId: staff.id, summary: "Lab 4 requester dashboard fixture", currentStatus: "WAITING_FOR_REQUESTER" },
    });
    const requesterAction = { performedById: staff.id, actionDescription: "Completed work visible to the Requester", result: "Requester browser fixture is ready.", status: "COMPLETED" as const, followUpRequired: false, completedAt: new Date() };
    await prisma.actionTaken.upsert({ where: { ticketId_createdById_requestKey: { ticketId: requesterTicket.id, createdById: staff.id, requestKey: "e2e-l4-requester-completed" } }, update: requesterAction, create: { ticketId: requesterTicket.id, createdById: staff.id, requestKey: "e2e-l4-requester-completed", ...requesterAction } });
    const staffTicket = await prisma.ticket.upsert({
      where: { ticketNumber: "E2E-L4-STAFF" },
      update: { ...common, requesterId: requester.id, assignedToUserId: staff.id, summary: "Lab 4 staff dashboard fixture", currentStatus: "NEW", resolvedAt: null, requesterResolutionIndicatedAt: null, requesterResolutionIndicatedByUserId: null, version: 1 },
      create: { ...common, ticketNumber: "E2E-L4-STAFF", requesterId: requester.id, assignedToUserId: staff.id, summary: "Lab 4 staff dashboard fixture", currentStatus: "NEW" },
    });
    const administratorTicket = await prisma.ticket.upsert({
      where: { ticketNumber: "E2E-L4-ADMIN" },
      update: { ...common, requesterId: requester.id, assignedToUserId: administrator.id, summary: "Lab 4 administrator dashboard fixture", currentStatus: "NEW", resolvedAt: null, requesterResolutionIndicatedAt: null, requesterResolutionIndicatedByUserId: null, version: 1 },
      create: { ...common, ticketNumber: "E2E-L4-ADMIN", requesterId: requester.id, assignedToUserId: administrator.id, summary: "Lab 4 administrator dashboard fixture", currentStatus: "NEW" },
    });
    const responsiveTicket = await prisma.ticket.upsert({
      where: { ticketNumber: "E2E-L4-RESPONSIVE" },
      update: { ...common, requesterId: requester.id, assignedToUserId: staff.id, summary: "Lab 4 responsive Actions Taken fixture", description: responsiveTicketDescription, currentStatus: "IN_PROGRESS", resolvedAt: null, requesterResolutionIndicatedAt: null, requesterResolutionIndicatedByUserId: null, version: 1 },
      create: { ...common, ticketNumber: "E2E-L4-RESPONSIVE", requesterId: requester.id, assignedToUserId: staff.id, summary: "Lab 4 responsive Actions Taken fixture", description: responsiveTicketDescription, currentStatus: "IN_PROGRESS" },
    });
    const accessibilityRequesterTicket = await prisma.ticket.upsert({
      where: { ticketNumber: "E2E-L4-A11Y-REQUESTER" },
      update: { ...common, requesterId: requester.id, assignedToUserId: staff.id, summary: "Lab 4 accessibility requester fixture", currentStatus: "WAITING_FOR_REQUESTER", resolvedAt: null, requesterResolutionIndicatedAt: null, requesterResolutionIndicatedByUserId: null, version: 1 },
      create: { ...common, ticketNumber: "E2E-L4-A11Y-REQUESTER", requesterId: requester.id, assignedToUserId: staff.id, summary: "Lab 4 accessibility requester fixture", currentStatus: "WAITING_FOR_REQUESTER" },
    });
    const accessibilityWorkflowTicket = await prisma.ticket.upsert({
      where: { ticketNumber: "E2E-L4-A11Y-WORKFLOW" },
      update: { ...common, requesterId: requester.id, assignedToUserId: staff.id, summary: "Lab 4 accessibility workflow fixture", currentStatus: "NEW", resolvedAt: null, requesterResolutionIndicatedAt: null, requesterResolutionIndicatedByUserId: null, version: 1 },
      create: { ...common, ticketNumber: "E2E-L4-A11Y-WORKFLOW", requesterId: requester.id, assignedToUserId: staff.id, summary: "Lab 4 accessibility workflow fixture", currentStatus: "NEW" },
    });
    const accessibilityRequesterAction = { performedById: staff.id, actionDescription: "Completed Action readable to the accessibility Requester", result: "Accessibility fixture result.", status: "COMPLETED" as const, followUpRequired: false, completedAt: new Date() };
    await prisma.actionTaken.upsert({ where: { ticketId_createdById_requestKey: { ticketId: accessibilityRequesterTicket.id, createdById: staff.id, requestKey: "e2e-l4-a11y-requester-completed" } }, update: accessibilityRequesterAction, create: { ticketId: accessibilityRequesterTicket.id, createdById: staff.id, requestKey: "e2e-l4-a11y-requester-completed", ...accessibilityRequesterAction } });
    const responsiveDraft = { actionDescription: responsiveActionDescription, result: null, status: "DRAFT" as const, followUpRequired: false, performedById: null, completedAt: null };
    await prisma.actionTaken.upsert({ where: { ticketId_createdById_requestKey: { ticketId: responsiveTicket.id, createdById: staff.id, requestKey: "e2e-l4-responsive-draft" } }, update: responsiveDraft, create: { ticketId: responsiveTicket.id, createdById: staff.id, requestKey: "e2e-l4-responsive-draft", ...responsiveDraft } });
    const responsiveCompleted = { actionDescription: "Completed responsive fixture Action with a long Result that remains reachable without horizontal scrolling in the Actions Taken representation.", result: "Responsive fixture Result: a deliberately long, deterministic completion note verifies that terminal shared Action text wraps cleanly at desktop, tablet, and mobile widths.", status: "COMPLETED" as const, followUpRequired: false, performedById: staff.id, completedAt: new Date() };
    await prisma.actionTaken.upsert({ where: { ticketId_createdById_requestKey: { ticketId: responsiveTicket.id, createdById: staff.id, requestKey: "e2e-l4-responsive-completed" } }, update: responsiveCompleted, create: { ticketId: responsiveTicket.id, createdById: staff.id, requestKey: "e2e-l4-responsive-completed", ...responsiveCompleted } });
    writeFileSync(fixturePath, JSON.stringify({ requesterTicketId: requesterTicket.id, staffTicketId: staffTicket.id, administratorTicketId: administratorTicket.id, responsiveTicketId: responsiveTicket.id, accessibilityRequesterTicketId: accessibilityRequesterTicket.id, accessibilityWorkflowTicketId: accessibilityWorkflowTicket.id }), "utf8");
  } finally {
    await prisma.$disconnect();
  }
}
