import { expect, test, type Page } from "@playwright/test";
import { lab4Fixtures } from "./prepare-fixtures";

const password = process.env.TOKTICKIT_E2E_PASSWORD ?? "ChangeMe123!";
const accounts = {
  requester: process.env.TOKTICKIT_E2E_LAB4_REQUESTER ?? "e2e.lab4.requester@example.com",
  staff: process.env.TOKTICKIT_E2E_LAB4_STAFF ?? "e2e.lab4.staff@example.com",
  administrator: process.env.TOKTICKIT_E2E_LAB4_ADMIN ?? "e2e.lab4.admin@example.com",
  passwordChange: process.env.TOKTICKIT_E2E_LAB4_PASSWORD_CHANGE ?? "e2e.lab4.password-change@example.com",
};

async function login(page: Page, email: string, path: string) {
  await page.goto(path);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: /password/i }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("E2E-L4-01: Requester follows a dashboard drill-down, views read-only Actions, and indicates resolution", async ({ page }) => {
  const { requesterTicketId } = lab4Fixtures();
  await login(page, accounts.requester, "#/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  const drillDown = page.getByRole("link", { name: /Open Tickets/ });
  await drillDown.focus();
  await expect(drillDown).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/tickets\?statusGroup=active/);
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await page.getByRole("link", { name: "E2E-L4-REQUESTER" }).click();
  await expect(page).toHaveURL(new RegExp(`#\\/tickets\\/${requesterTicketId}$`));
  await expect(page.getByRole("heading", { name: "Ticket Details" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Completed work visible to the Requester/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Action" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Edit Action/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Problem Appears Resolved" }).click();
  await expect(page.getByText("You indicated that the problem appears resolved.")).toBeVisible();
});

test("E2E-L4-02: IT Staff creates, edits, completes an Action, and resolves a Ticket from a dashboard drill-down", async ({ page }) => {
  const { staffTicketId } = lab4Fixtures();
  await login(page, accounts.staff, "#/staff/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByRole("link", { name: /My Tickets/ }).click();
  await expect(page).toHaveURL(/#\/staff\/tickets\?owner=me&statusGroup=active/);
  await page.getByLabel("Search tickets").fill("E2E-L4-STAFF");
  await page.getByRole("row", { name: /E2E-L4-STAFF/ }).getByRole("link", { name: "Open Detail" }).click();
  await expect(page).toHaveURL(new RegExp(`#\\/staff\\/tickets\\/${staffTicketId}`));
  await expect(page.getByRole("heading", { name: "Ticket Details" })).toBeVisible();

  await page.getByRole("button", { name: "Add Action" }).click();
  await page.getByLabel("Action Description").fill("Draft work captured in the Lab 4 browser flow.");
  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page.getByText("Draft work captured in the Lab 4 browser flow.")).toBeVisible();
  const edit = page.getByRole("button", { name: /Edit Action/ });
  await edit.click();
  await page.getByLabel("Action Description").fill("Edited work captured in the Lab 4 browser flow.");
  await page.getByLabel("Result").fill("The browser flow completed the work.");
  await page.getByRole("button", { name: "Complete Action" }).click();
  await expect(page.getByText("COMPLETED", { exact: true })).toBeVisible();

  await page.getByLabel("Ticket status").selectOption("OPEN");
  await page.getByRole("button", { name: "Save status" }).click();
  await expect(page.getByLabel("Ticket status")).toHaveValue("OPEN");
  await page.getByLabel("Ticket status").selectOption("IN_PROGRESS");
  await page.getByRole("button", { name: "Save status" }).click();
  await expect(page.getByLabel("Ticket status")).toHaveValue("IN_PROGRESS");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Ticket status").selectOption("RESOLVED");
  await page.getByRole("button", { name: "Save status" }).click();
  await expect(page.getByLabel("Ticket status")).toHaveValue("RESOLVED");
});

test("E2E-L4-03: Administrator reaches operational detail from the dashboard, manages an Action, and retains User Management", async ({ page }) => {
  const { administratorTicketId } = lab4Fixtures();
  await login(page, accounts.administrator, "#/staff/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByRole("link", { name: /My Tickets/ }).click();
  await expect(page).toHaveURL(/#\/staff\/tickets\?owner=me&statusGroup=active/);
  await page.getByLabel("Search tickets").fill("E2E-L4-ADMIN");
  await page.getByRole("row", { name: /E2E-L4-ADMIN/ }).getByRole("link", { name: "Open Detail" }).click();
  await expect(page).toHaveURL(new RegExp(`#\\/staff\\/tickets\\/${administratorTicketId}`));
  await expect(page.getByRole("heading", { name: "Ticket Details" })).toBeVisible();
  await page.getByRole("button", { name: "Add Action" }).click();
  await page.getByLabel("Action Description").fill("Administrator operational Action.");
  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page.getByText("Administrator operational Action.")).toBeVisible();
  await page.getByRole("link", { name: "User Management" }).click();
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
});

test("E2E-L4-04: protected Lab 4 routes enforce role and forced-password boundaries", async ({ page }) => {
  await login(page, accounts.requester, "#/dashboard");
  await page.goto("#/staff/dashboard");
  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
  await page.goto("#/admin/users");
  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByLabel("Email")).toBeVisible();
  await login(page, accounts.staff, "#/staff/dashboard");
  await page.goto("#/admin/users");
  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByLabel("Email")).toBeVisible();
  await login(page, accounts.passwordChange, "#/staff/dashboard");
  await expect(page.getByRole("heading", { name: "Change Password" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
});

test("E2E-L4-05: a dashboard 401 clears protected content and returns to Login", async ({ page }) => {
  await page.route("**/api/dashboard/requester", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }) }));
  await login(page, accounts.requester, "#/dashboard");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
});
