import { expect, test, type Page } from "@playwright/test";

const requester = {
  id: 3,
  name: "Keyboard Requester",
  email: "keyboard@example.com",
};

async function mockCreateTicketApi(page: Page) {
  await page.addInitScript((selectedRequester) => {
    localStorage.setItem(
      "toktickit-selected-requester",
      JSON.stringify(selectedRequester),
    );
  }, requester);

  await page.route("**/api/categories", (route) =>
    route.fulfill({ json: [{ id: 1, name: "Hardware" }] }),
  );
  await page.route("**/api/related-systems", (route) =>
    route.fulfill({ json: [{ id: 2, name: "Corporate Laptop" }] }),
  );
  await page.route("**/api/tickets", (route) => {
    if (route.request().method() !== "POST") {
      return route.fulfill({
        json: { data: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } },
      });
    }

    return route.fulfill({
      status: 201,
      json: {
        id: 42,
        ticketNumber: "TKT-2026-000042",
        requesterId: requester.id,
        categoryId: 1,
        relatedSystemId: 2,
        summary: "Keyboard-only ticket submission",
        description: "This ticket was created entirely with keyboard interaction.",
        requestedPriority: "HIGH",
        currentStatus: "NEW",
        createdAt: "2026-09-05T00:00:00.000Z",
        updatedAt: "2026-09-05T00:00:00.000Z",
      },
    });
  });
}

test("E2E-04: keyboard-only ticket creation", async ({ page }) => {
  await mockCreateTicketApi(page);
  await page.goto("/#/tickets/new");

  await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();

  const category = page.getByLabel("Category");
  const relatedSystem = page.getByLabel("Related System");
  const priority = page.getByLabel("Priority");
  const summary = page.getByLabel("Summary");
  const description = page.getByLabel("Description");
  const submit = page.getByRole("button", { name: "Submit Ticket" });

  await category.focus();
  await expect(category).toBeFocused();
  await category.selectOption("1");
  await expect(category).toHaveValue("1");

  await page.keyboard.press("Tab");
  await expect(relatedSystem).toBeFocused();
  await relatedSystem.selectOption("2");
  await expect(relatedSystem).toHaveValue("2");

  await page.keyboard.press("Tab");
  await expect(priority).toBeFocused();
  await priority.selectOption("HIGH");
  await expect(priority).toHaveValue("HIGH");

  await page.keyboard.press("Tab");
  await expect(summary).toBeFocused();
  await page.keyboard.type("Keyboard-only ticket submission");

  await page.keyboard.press("Tab");
  await expect(description).toBeFocused();
  await page.keyboard.type(
    "This ticket was created entirely with keyboard interaction.",
  );

  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(submit).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Ticket created" })).toBeVisible();
  await expect(page.getByText("TKT-2026-000042")).toBeVisible();
});
