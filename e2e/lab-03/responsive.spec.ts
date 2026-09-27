import { expect, test, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const password = process.env.TOKTICKIT_E2E_PASSWORD ?? "ChangeMe123!";
const accounts = {
  requester: process.env.TOKTICKIT_E2E_REQUESTER ?? "e2e.requester@example.com",
  staff: process.env.TOKTICKIT_E2E_STAFF ?? "e2e.staff@example.com",
  admin: process.env.TOKTICKIT_E2E_ADMIN ?? "e2e.admin@example.com",
};
const fixturePath = "/tmp/toktickit-lab3-e2e-ticket.json";
const ticketId = existsSync(fixturePath) ? JSON.parse(readFileSync(fixturePath, "utf8")).ticketId as number : 0;
const screenshotRoot = resolve("artifacts/lab-03/screenshots");

function screenshotPath(role: "requester" | "staff" | "admin", pageName: string, width: number, height: number) {
  const directory = resolve(screenshotRoot, role);
  mkdirSync(directory, { recursive: true });
  return resolve(directory, `${pageName}-${width}x${height}.png`);
}

async function login(page: Page, email: string) {
  await page.goto("#/tickets");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: /password/i }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function assertNoUnexpectedOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
  { name: "small mobile", width: 320, height: 568 },
]) {
  test.describe(`${viewport.name} responsive layouts`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("Requester My Tickets and Create Ticket remain usable", async ({ page }) => {
      await login(page, accounts.requester);
      await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
      await page.screenshot({ path: screenshotPath("requester", "my-tickets", viewport.width, viewport.height), fullPage: true });
      if ((page.viewportSize()?.width ?? 1440) < 768) {
        await page.getByRole("button", { name: "Open navigation menu" }).click();
      }
      const createTicketLink = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Create Ticket" });
      await expect(createTicketLink).toBeVisible();
      await assertNoUnexpectedOverflow(page);
      await createTicketLink.click();
      await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
      await expect(page.getByLabel("Summary")).toBeVisible();
      await expect(page.getByRole("button", { name: "Submit Ticket" })).toBeVisible();
      await page.screenshot({ path: screenshotPath("requester", "create-ticket", viewport.width, viewport.height), fullPage: true });
      await assertNoUnexpectedOverflow(page);
    });

    test("IT Staff Queue remains readable and controls remain usable", async ({ page }) => {
      await login(page, accounts.staff);
      await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
      await expect(page.getByLabel("Search tickets")).toBeVisible();
      await expect(page.getByLabel("Status")).toBeVisible();
      await expect(page.getByRole("link", { name: "Open Detail" }).first()).toBeVisible();
      await page.screenshot({ path: screenshotPath("staff", "ticket-queue", viewport.width, viewport.height), fullPage: true });
      await assertNoUnexpectedOverflow(page);
    });

    test("Administrator User Management remains usable", async ({ page }) => {
      await login(page, accounts.admin);
      await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Create User" })).toBeVisible();
      await expect(page.getByLabel("Search users")).toBeVisible();
      await assertNoUnexpectedOverflow(page);
      await page.screenshot({ path: screenshotPath("admin", "user-management", viewport.width, viewport.height), fullPage: true });
      test.skip(!ticketId, "E2E fixture ticket is unavailable");
      await page.goto(`#/tickets/${ticketId}`);
      await expect(page.getByRole("heading", { name: "Ticket Inspection" })).toBeVisible();
      await assertNoUnexpectedOverflow(page);
      await page.screenshot({ path: screenshotPath("admin", "ticket-inspection", viewport.width, viewport.height), fullPage: true });
    });

    test("ticket detail layouts remain readable", async ({ page }) => {
      await login(page, accounts.staff);
      await page.goto(`#/staff/tickets/${ticketId}`);
      await expect(page.getByRole("heading", { name: "Ticket Details" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Workflow" })).toBeVisible();
      await assertNoUnexpectedOverflow(page);
      await page.screenshot({ path: screenshotPath("staff", "ticket-detail", viewport.width, viewport.height), fullPage: true });
    });
  });
}
