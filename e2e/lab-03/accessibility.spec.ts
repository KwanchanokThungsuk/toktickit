import { expect, test, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

const password = process.env.TOKTICKIT_E2E_PASSWORD ?? "ChangeMe123!";
const accounts = {
  requester: process.env.TOKTICKIT_E2E_REQUESTER ?? "e2e.requester@example.com",
  staff: process.env.TOKTICKIT_E2E_STAFF ?? "e2e.staff@example.com",
  admin: process.env.TOKTICKIT_E2E_ADMIN ?? "e2e.admin@example.com",
};
const fixturePath = "/tmp/toktickit-lab3-e2e-ticket.json";
const ticketId = existsSync(fixturePath) ? JSON.parse(readFileSync(fixturePath, "utf8")).ticketId as number : 0;

async function login(page: Page, email: string) {
  await page.goto("#/tickets");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: /password/i }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function expectVisibleFocus(page: Page) {
  const focused = await page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement)) return false;
    const style = getComputedStyle(element);
    return style.outlineStyle !== "none" || style.boxShadow !== "none";
  });
  expect(focused).toBe(true);
}

test("Requester Login and Create Ticket controls are labeled and keyboard reachable", async ({ page }) => {
  await page.goto("#/tickets");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("textbox", { name: /password/i })).toBeVisible();
  await page.getByLabel("Email").focus();
  await page.keyboard.press("Tab");
  await expectVisibleFocus(page);
  await login(page, accounts.requester);
  const createTicketLink = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Create Ticket" });
  await expect(createTicketLink).toBeVisible();
  await createTicketLink.click();
  await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
  await expect(page.getByLabel("Category")).toBeVisible();
  await expect(page.getByLabel("Related System")).toBeVisible();
  await expect(page.getByLabel("Summary")).toBeVisible();
  await expect(page.getByLabel("Description")).toBeVisible();
  await page.getByLabel("Summary").focus();
  await page.keyboard.press("Tab");
  await expectVisibleFocus(page);
});

test("IT Staff Queue and detail workflow controls have accessible names", async ({ page }) => {
  test.skip(!ticketId, "E2E fixture ticket is unavailable");
  await login(page, accounts.staff);
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.getByLabel("Search tickets")).toBeVisible();
  await expect(page.getByLabel("Status")).toBeVisible();
  await page.goto(`#/staff/tickets/${ticketId}`);
  await expect(page.getByRole("heading", { name: "Ticket Details" })).toBeVisible();
  await expect(page.getByLabel("Ticket owner")).toBeVisible();
  await expect(page.getByLabel("IT Priority")).toBeVisible();
  await expect(page.getByLabel("Ticket status")).toBeVisible();
  await page.getByLabel("IT Priority").focus();
  await expectVisibleFocus(page);
});

test("Administrator User Management and inspection controls are labeled", async ({ page }) => {
  test.skip(!ticketId, "E2E fixture ticket is unavailable");
  await login(page, accounts.admin);
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await expect(page.getByLabel("Search users")).toBeVisible();
  await expect(page.getByLabel("Role")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create User" })).toBeVisible();
  await page.goto(`#/tickets/${ticketId}`);
  await expect(page.getByRole("heading", { name: "Ticket Inspection" })).toBeVisible();
  await expect(page.getByLabel("IT Priority")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save IT Priority" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Public Comments" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Internal Notes" })).toBeVisible();
});
