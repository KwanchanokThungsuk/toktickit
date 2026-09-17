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
    } else {
      await prisma.user.update({ where: { id: existing.id }, data: { name: user.name, role: user.role, isActive: user.isActive } });
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
