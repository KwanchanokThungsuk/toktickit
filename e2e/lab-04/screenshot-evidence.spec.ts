import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { lab4Fixtures } from "./prepare-fixtures";

const password = process.env.TOKTICKIT_E2E_PASSWORD ?? "ChangeMe123!";
const staff = process.env.TOKTICKIT_E2E_LAB4_STAFF ?? "e2e.lab4.staff@example.com";
const requester = process.env.TOKTICKIT_E2E_LAB4_REQUESTER ?? "e2e.lab4.requester@example.com";
const root = resolve("artifacts/lab-04/screenshots/actions-taken");

async function login(page: Page) {
  const { responsiveTicketId } = lab4Fixtures();
  await page.goto(`#/staff/tickets/${responsiveTicketId}`);
  await page.getByLabel("Email").fill(staff);
  await page.getByRole("textbox", { name: /password/i }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
}

async function loginRequester(page: Page) {
  const { requesterTicketId } = lab4Fixtures();
  await page.goto(`#/tickets/${requesterTicketId}`);
  await page.getByLabel("Email").fill(requester);
  await page.getByRole("textbox", { name: /password/i }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
}

function path(name: string) {
  mkdirSync(root, { recursive: true });
  return resolve(root, name);
}

test("captures representative Lab 4 Actions Taken evidence", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await expect(page.getByText("COMPLETED").first()).toBeVisible();
  await expect(page.getByText("DRAFT").first()).toBeVisible();
  await page.screenshot({ path: path("list-desktop.png"), fullPage: true });

  await page.getByRole("button", { name: /Edit Action/ }).first().click();
  await expect(page.getByRole("heading", { name: /Edit Action/ })).toBeVisible();
  await page.screenshot({ path: path("edit-draft-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Cancel edit" }).click();

  await page.getByRole("button", { name: "Add Action" }).click();
  await expect(page.getByRole("heading", { name: "Add Action" })).toBeVisible();
  await page.screenshot({ path: path("create-form-desktop.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page.getByRole("alert")).toContainText("Action Description is required.");
  await page.screenshot({ path: path("validation-mobile.png"), fullPage: true });

  await page.getByRole("button", { name: "Cancel" }).click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.getByText(/COMPLETED · Read-only/).first()).toBeVisible();
  await page.screenshot({ path: path("completed-readonly-tablet.png"), fullPage: true });
});

test("captures Requester read-only Actions Taken evidence", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginRequester(page);
  await expect(page.getByRole("button", { name: "Add Action" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Edit Action/ })).toHaveCount(0);
  await page.screenshot({ path: path("requester-readonly-mobile.png"), fullPage: true });
});
