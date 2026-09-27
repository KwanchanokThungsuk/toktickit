import { expect, test, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const password = process.env.TOKTICKIT_E2E_PASSWORD ?? "ChangeMe123!";
const accounts = {
  requester: process.env.TOKTICKIT_E2E_REQUESTER ?? "e2e.requester@example.com",
  staff: process.env.TOKTICKIT_E2E_STAFF ?? "e2e.staff@example.com",
  admin: process.env.TOKTICKIT_E2E_ADMIN ?? "e2e.admin@example.com",
  passwordChange: process.env.TOKTICKIT_E2E_PASSWORD_CHANGE ?? "e2e.password-change@example.com",
};
const fixturePath = "/tmp/toktickit-lab3-e2e-ticket.json";
const e2eTicketId = existsSync(fixturePath)
  ? JSON.parse(readFileSync(fixturePath, "utf8")).ticketId as number
  : Number(process.env.TOKTICKIT_E2E_TICKET_ID ?? 0);
const authScreenshotDirectory = resolve("artifacts/lab-03/screenshots/auth");
mkdirSync(authScreenshotDirectory, { recursive: true });

async function login(page: Page, email: string) {
  await page.goto("#/tickets");

  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: /password/i }).fill(password);

  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe.configure({ mode: "serial" });

test("E2E-AUTH-01: invalid credentials are rejected", async ({ page }) => {
  await page.goto("#/tickets");
  await page.getByLabel("Email").fill(accounts.requester);
  await page.getByRole("textbox", { name: /password/i }).fill("definitely-wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("E2E-AUTH-02: unauthenticated deep links return to sign in", async ({ page }) => {
  await page.goto("#/staff/tickets");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.screenshot({ path: resolve(authScreenshotDirectory, "login.png"), fullPage: true });
});

test("E2E-REQUESTER-01: authenticated Requester sees only Requester navigation", async ({ page }) => {
  await login(page, accounts.requester);
  await expect(page.getByRole("link", { name: "My Tickets" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Create Ticket" })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Ticket Queue" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "User Management" })).toHaveCount(0);
});

test("E2E-STAFF-01: authenticated IT Staff sees the Ticket Queue", async ({ page }) => {
  await login(page, accounts.staff);
  await expect(page.getByRole("link", { name: "Ticket Queue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  await expect(page.getByRole("link", { name: "User Management" })).toHaveCount(0);
});

test("E2E-ADMIN-01: authenticated Administrator sees User Management only", async ({ page }) => {
  await login(page, accounts.admin);
  await expect(page.getByRole("link", { name: "User Management" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ticket Queue" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
});

test("E2E-AUTH-03: logout returns the browser to sign in", async ({ page }) => {
  await login(page, accounts.requester);
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.goto("#/tickets");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("E2E-AUTH-04: initial-password account completes the forced password change flow", async ({ page }) => {
  await login(page, accounts.passwordChange);
  await expect(page.getByRole("heading", { name: "Change Password" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ticket Queue" })).toHaveCount(0);
  await page.screenshot({ path: resolve(authScreenshotDirectory, "forced-change-password.png"), fullPage: true });
  const newPassword = `E2E-New-${Date.now()}!`;
  await page.getByLabel("Current password").fill(password);
  await page.getByRole("textbox", { name: /^New password/ }).fill(newPassword);
  await page.getByRole("textbox", { name: /^Confirm new password/ }).fill(newPassword);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Change Password" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  await page.screenshot({ path: resolve(authScreenshotDirectory, "authenticated-after-password-change.png"), fullPage: true });
});

test("E2E-REQUESTER-02: Requester can create and view an owned ticket", async ({ page }) => {
  await login(page, accounts.requester);
  await page
  .getByRole("navigation", { name: "Main navigation" })
  .getByRole("link", { name: "Create Ticket" })
  .click();
  await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
  await page.getByLabel("Category").selectOption({ index: 1 });
  await page.getByLabel("Related System").selectOption({ index: 1 });
  const summary = `E2E requester ticket ${Date.now()}`;
  await page.getByLabel("Summary").fill(summary);
  await page.getByLabel("Description").fill("Created through the authenticated Requester workflow.");
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await expect(page.getByRole("heading", { name: "Ticket created" })).toBeVisible();
  const ticketNumber = await page.locator("text=/TKT-/").first().textContent();
  expect(ticketNumber).toBeTruthy();
  await page.getByRole("button", { name: "View Ticket" }).click();
  await expect(page.getByRole("heading", { name: "Ticket Details" })).toBeVisible();
  await expect(page.getByText(summary)).toBeVisible();
});

test("E2E-STAFF-02: IT Staff can open a queue ticket and use workflow controls", async ({ page }) => {
  await login(page, accounts.staff);
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  await page.getByLabel("Search tickets").fill("E2E-2026");
  await page.getByRole("link", { name: "Open Detail" }).first().click();
  await expect(page.getByRole("heading", { name: "Ticket Details" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Workflow" })).toBeVisible();
  await page.getByLabel("IT Priority").selectOption("HIGH");
  await page.getByRole("button", { name: "Save priority" }).click();
  await expect(page.getByLabel("IT Priority")).toHaveValue("HIGH");
  await page.getByRole("button", { name: "Claim ticket" }).click();
  await expect(page.getByLabel("Ticket owner").locator("option:checked")).toHaveText("E2E IT Staff (IT_STAFF)");
  await page.getByLabel("Ticket status").selectOption("OPEN");
  await page.getByRole("button", { name: "Save status" }).click();
  await expect(page.getByText("OPEN").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Public Comments" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Internal Notes" })).toBeVisible();
  const runId = Date.now();
  const publicComment = `E2E staff public comment ${runId}`;
  const internalNote = `E2E staff internal note ${runId}`;
  await page.getByLabel("Add a comment").fill(publicComment);
  await page.getByRole("button", { name: "Add comment" }).click();
  await expect(page.getByRole("region", { name: "Public Comments" }).locator("li p").filter({ hasText: publicComment })).toBeVisible();
  await page.getByLabel("Add an internal note").fill(internalNote);
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByRole("region", { name: "Internal Notes" }).locator("li p").filter({ hasText: internalNote })).toBeVisible();
});

test("E2E-ADMIN-02: Administrator can manage users without staff navigation", async ({ page }) => {
  await login(page, accounts.admin);
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create User" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ticket Queue" })).toHaveCount(0);
  await page.getByRole("textbox", { name: /search users/i }).fill("e2e.requester@example.com");
  await expect(page.getByText("e2e.requester@example.com")).toBeVisible();
});

test("E2E-ADMIN-03: Administrator can inspect communications and update IT Priority", async ({ page }) => {
  await login(page, accounts.admin);
  await page.goto(`#/tickets/${e2eTicketId}`);
  await expect(page.getByRole("heading", { name: "Ticket Inspection" })).toBeVisible();
  await expect(page.getByText("E2E workflow fixture")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Public Comments" })).toBeVisible();
  await expect(page.getByText("E2E fixture public comment")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Internal Notes" })).toBeVisible();
  await expect(page.getByText("E2E fixture internal note")).toBeVisible();
  await page.getByLabel("IT Priority").selectOption("HIGH");
  await page.getByRole("button", { name: "Save IT Priority" }).click();
  await expect(page.getByLabel("IT Priority")).toHaveValue("HIGH");
  await expect(page.getByRole("button", { name: "Claim ticket" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add comment" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add note" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ticket Queue" })).toHaveCount(0);
});

test("E2E-AUTHZ-01: Requester cannot enter staff or admin areas", async ({ page }) => {
  await login(page, accounts.requester);
  await page.goto("#/staff/tickets");
  await expect(page.getByText("IT Staff access is required to view the Ticket Queue.")).toBeVisible();
  await page.goto("#/admin/users");
  await expect(page).toHaveURL(/#\/tickets$/);
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "User Management" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create User" })).toHaveCount(0);
});

test("E2E-AUTHZ-02: Administrator cannot enter the Staff Queue", async ({ page }) => {
  await login(page, accounts.admin);
  await page.goto("#/staff/tickets");
  await expect(page.getByText("IT Staff access is required to view the Ticket Queue.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Claim ticket" })).toHaveCount(0);
});

test("E2E-AUTHZ-03: IT Staff cannot enter User Management", async ({ page }) => {
  await login(page, accounts.staff);
  await page.goto("#/admin/users");
  await expect(page).toHaveURL(/#\/staff\/tickets$/);
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "User Management" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create User" })).toHaveCount(0);
});
