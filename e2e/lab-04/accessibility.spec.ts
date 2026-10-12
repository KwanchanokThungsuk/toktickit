import { expect, test, type Locator, type Page } from "@playwright/test";
import { lab4Fixtures } from "./prepare-fixtures";

const password = process.env.TOKTICKIT_E2E_PASSWORD ?? "ChangeMe123!";
const accounts = {
  requester:
    process.env.TOKTICKIT_E2E_LAB4_REQUESTER ??
    "e2e.lab4.requester@example.com",
  staff: process.env.TOKTICKIT_E2E_LAB4_STAFF ?? "e2e.lab4.staff@example.com",
  administrator:
    process.env.TOKTICKIT_E2E_LAB4_ADMIN ?? "e2e.lab4.admin@example.com",
  passwordChange:
    process.env.TOKTICKIT_E2E_LAB4_PASSWORD_CHANGE ??
    "e2e.lab4.password-change@example.com",
};

async function login(page: Page, email: string, path: string) {
  await page.goto(path);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: /password/i }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function expectVisibleFocus(page: Page, locator: Locator) {
  await locator.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(locator).toBeFocused();
  const visible = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.outlineStyle !== "none" || style.boxShadow !== "none";
  });
  expect(visible).toBe(true);
}

test.describe.configure({ mode: "serial" });

test("E2E-L4-A11Y-01: Requester uses Dashboard, mobile navigation, read-only Actions, and advisory resolution by keyboard", async ({
  page,
}) => {
  const { accessibilityRequesterTicketId } = lab4Fixtures();
  await login(page, accounts.requester, "#/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  const dashboardLink = navigation.getByRole("link", { name: "Dashboard" });
  await expectVisibleFocus(page, dashboardLink);

  const openTickets = page.getByRole("link", { name: /Open Tickets/ });
  await expectVisibleFocus(page, openTickets);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/tickets\?statusGroup=active/);
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();

  await page.goto(`#/tickets/${accessibilityRequesterTicketId}`);
  await expect(
    page.getByRole("heading", { name: "Ticket Details" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Actions Taken" }),
  ).toBeVisible();
  await expect(page.getByText("COMPLETED", { exact: true })).toBeVisible();
  await expect(page.getByText("Read-only", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Action" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Edit Action/ })).toHaveCount(
    0,
  );

  const indicateResolution = page.getByRole("button", {
    name: "Problem Appears Resolved",
  });
  await expectVisibleFocus(page, indicateResolution);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText(
    "You indicated that the problem appears resolved.",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation menu" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    navigation.getByRole("link", { name: "My Tickets" }),
  ).toBeVisible();
  await expectVisibleFocus(page, page.getByRole("button", { name: "Logout" }));
});

test("E2E-L4-A11Y-02: IT Staff Action form validates labels, errors, focus, and resolution-gate text", async ({
  page,
}) => {
  const { responsiveTicketId } = lab4Fixtures();
  await login(page, accounts.staff, `#/staff/tickets/${responsiveTicketId}`);
  await expect(
    page.getByRole("heading", { name: "Ticket Details" }),
  ).toBeVisible();
  await expect(page.getByLabel("Ticket owner")).toBeVisible();
  await expect(page.getByLabel("IT Priority", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Ticket status")).toBeVisible();
  await expect(
    page.getByText(
      /Resolve becomes available after at least one Completed Action/,
    ),
  ).toBeVisible();
  await expectVisibleFocus(
    page,
    page.getByRole("link", { name: "Review Actions Taken" }),
  );

  const addAction = page.getByRole("button", { name: "Add Action" });
  await expectVisibleFocus(page, addAction);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Add Action" })).toBeVisible();
  const description = page.getByLabel("Action Description");
  const result = page.getByLabel("Result");
  const followUp = page.getByLabel("Follow-Up Required");
  await expect(description).toHaveAttribute(
    "aria-describedby",
    /action-description-count/,
  );
  await expectVisibleFocus(page, description);
  await page.keyboard.press("Tab");
  await expect(result).toBeFocused();
  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(description).toHaveAttribute("aria-invalid", "true");
  await expect(description).toHaveAttribute(
    "aria-describedby",
    /action-description-error/,
  );
  await expect(page.getByRole("alert")).toContainText(
    "Action Description is required.",
  );
  await expect(description).toBeFocused();

  await description.fill("Keyboard validation evidence");
  await followUp.check();
  await page.getByRole("button", { name: "Save Draft" }).click();
  const followUpNote = page.getByLabel("Follow-up Note *");
  await expect(followUpNote).toHaveAttribute("aria-invalid", "true");
  await expect(followUpNote).toHaveAttribute(
    "aria-describedby",
    /action-follow-up-note-error/,
  );
  await expect(followUpNote).toBeFocused();
});

test("E2E-L4-A11Y-03: IT Staff receives live save feedback and native workflow confirmation respects keyboard Cancel and Accept", async ({
  page,
}) => {
  const { accessibilityWorkflowTicketId } = lab4Fixtures();
  await login(
    page,
    accounts.staff,
    `#/staff/tickets/${accessibilityWorkflowTicketId}`,
  );
  await expect(
    page.getByRole("heading", { name: "Ticket Details" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add Action" }).focus();
  await page.keyboard.press("Enter");
  await page
    .getByLabel("Action Description")
    .fill("Keyboard-saved accessibility Action.");
  const saveDraft = page.getByRole("button", { name: "Save Draft" });
  await expectVisibleFocus(page, saveDraft);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Action saved.");

  const status = page.getByLabel("Ticket status");
  const saveStatus = page.getByRole("button", { name: "Save status" });
  await status.selectOption("OPEN");
  await expectVisibleFocus(page, saveStatus);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("status").filter({ hasText: "Ticket status updated." }),
  ).toBeVisible();
  await expect(status).toHaveValue("OPEN");

  await status.selectOption("CANCELLED");
  let cancelledMessage = "";
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    cancelledMessage = dialog.message();
    await dialog.dismiss();
  });
  await saveStatus.focus();
  await page.keyboard.press("Enter");
  expect(cancelledMessage).toContain("Cancel this Ticket?");
  await expect(page.locator(".ticket-detail__header .badge")).toHaveText(
    "OPEN",
  );

  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });
  await saveStatus.focus();
  await page.keyboard.press("Enter");
  await expect(status).toHaveValue("CANCELLED");
  await expect(
    page.getByRole("status").filter({ hasText: "Ticket status updated." }),
  ).toBeVisible();
});

test("E2E-L4-A11Y-04: Administrator controls are labeled and role denial is understandable", async ({
  page,
}) => {
  const { administratorTicketId } = lab4Fixtures();
  await login(page, accounts.administrator, "#/admin/users");
  await expect(
    page.getByRole("heading", { name: "User Management" }),
  ).toBeVisible();
  await expectVisibleFocus(
    page,
    page.getByRole("button", { name: "Create User" }),
  );
  await page.goto(`#/tickets/${administratorTicketId}`);
  await expect(
    page.getByRole("heading", { name: "Ticket Inspection" }),
  ).toBeVisible();
  await expect(page.getByLabel("Owner", { exact: true })).toBeVisible();
  await expect(page.getByLabel("IT Priority", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Status", { exact: true })).toBeVisible();
  await expectVisibleFocus(
    page,
    page.getByRole("button", { name: "Add Action" }),
  );

  await page.getByRole("button", { name: "Logout" }).click();
  await login(page, accounts.requester, "#/staff/dashboard");
  const denied = page.getByRole("alert");
  await expect(denied).toContainText("Access denied");
  await expect(
    page.getByRole("heading", { name: "Access denied" }),
  ).toBeVisible();
});

test("E2E-L4-A11Y-05: session expiry, forced password change, and retry failures expose safe accessible states", async ({
  page,
}) => {
  await page.route("**/api/dashboard/requester", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "UNAUTHORIZED", message: "Authentication required." },
      }),
    }),
  );
  await login(page, accounts.requester, "#/dashboard");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
});

test("E2E-L4-A11Y-06: forced-password recovery presents a labeled Change Password flow", async ({
  page,
}) => {
  await login(page, accounts.passwordChange, "#/staff/dashboard");
  await expect(
    page.getByRole("heading", { name: "Change Password" }),
  ).toBeVisible();
  await expect(page.getByLabel("Current password")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: /^New password/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: /^Confirm new password/ }),
  ).toBeVisible();
});

test("E2E-L4-A11Y-07: dashboard Retry remains keyboard reachable after a safe error", async ({
  page,
}) => {
  await page.route("**/api/dashboard/requester", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "INTERNAL_ERROR", message: "Temporary failure." },
      }),
    }),
  );
  await login(page, accounts.requester, "#/dashboard");
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Unable to load dashboard");
  await expectVisibleFocus(page, page.getByRole("button", { name: "Retry" }));
});
