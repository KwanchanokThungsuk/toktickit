import { getPrisma } from "../src/prisma.js";

async function main() {
  const prisma = getPrisma();
  
  // 1. Seed Categories (4 required categories)
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

  // 2. Seed Related Systems (6+ required related systems)
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

  // 3. Seed Development Requesters (4 active, 1 inactive)
  const requesters = [
    { name: "Alice Smith", email: "alice.smith@example.com", isActive: true },
    { name: "Bob Jones", email: "bob.jones@example.com", isActive: true },
    { name: "Charlie Brown", email: "charlie.brown@example.com", isActive: true },
    { name: "Diana Prince", email: "diana.prince@example.com", isActive: true },
    { name: "Inactive User", email: "inactive.user@example.com", isActive: false },
  ];

  for (const req of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: req.email },
      update: { name: req.name, isActive: req.isActive },
      create: req,
    });
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
