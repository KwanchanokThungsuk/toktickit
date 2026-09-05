import { expect, test, type Locator, type Page } from "@playwright/test";

const screenshotRoot = "artifacts/lab-02/screenshots";
const requester = {
  id: 3,
  name: "Alexandria Verylongrequestername",
  email: "alex@example.com",
};

async function mockApi(page: Page) {
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
    route.fulfill({ json: [{ id: 1, name: "Corporate Laptop" }] }),
  );
  await page.route(/\/api\/tickets\/42$/, (route) =>
    route.fulfill({
      json: {
        id: 42,
        ticketNumber: "TKT-2026-000042",
        requester: { id: requester.id, name: requester.name },
        category: { id: 1, name: "Hardware" },
        relatedSystem: { id: 1, name: "Corporate Laptop" },
        summary: "Laptop battery drains quickly",
        description: "The battery drains while idle during the workday.",
        requestedPriority: "HIGH",
        currentStatus: "NEW",
        createdAt: "2026-08-31T09:14:00.000Z",
        attachments: [],
      },
    }),
  );
  await page.route(/\/api\/tickets(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: 42,
            ticketNumber: "TKT-2026-000042",
            summary: "Laptop battery drains quickly",
            category: { id: 1, name: "Hardware" },
            relatedSystem: { id: 1, name: "Corporate Laptop" },
            requestedPriority: "HIGH",
            currentStatus: "NEW",
            createdAt: "2026-08-31T09:14:00.000Z",
            updatedAt: "2026-08-31T09:14:00.000Z",
          },
        ],
        meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
      },
    }),
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function expectReachable(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();

  await locator.scrollIntoViewIfNeeded();

  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}

async function expectGridColumns(page: Page, count: number) {
  const actualCount = await page.locator(".ticket-detail__grid").evaluate(
    (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length,
  );
  expect(actualCount).toBe(count);
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("RESP-01: desktop layout at 1280 × 800 has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto("/#/tickets/new");
  await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
  const category = page.getByLabel("Category");
  const relatedSystem = page.getByLabel("Related System");
  expect((await category.boundingBox())!.y).toBe((await relatedSystem.boundingBox())!.y);
  await expectReachable(page, page.getByRole("button", { name: "Submit Ticket" }));
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${screenshotRoot}/create-ticket/desktop-initial.png`, fullPage: true });

  await page.goto("/#/tickets");
  await expect(page.locator(".my-tickets__table")).toBeVisible();
  await expect(page.locator(".my-tickets__cards")).toBeHidden();
  await expectReachable(
    page,
    page.getByRole("main").getByRole("link", { name: "Create Ticket" }),
  );
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${screenshotRoot}/my-tickets/desktop-list.png`, fullPage: true });

  await page.goto("/#/tickets/42");
  await expect(page.getByRole("heading", { name: "Ticket Details" })).toBeVisible();
  await expectGridColumns(page, 4);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${screenshotRoot}/ticket-detail/desktop-detail.png`, fullPage: true });
});

test("RESP-02: tablet layout at 768 × 1024 uses two-column forms and reduced tables", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });

  await page.goto("/#/tickets/new");
  await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
  const category = page.getByLabel("Category");
  const relatedSystem = page.getByLabel("Related System");
  const priority = page.getByLabel("Priority");
  expect((await category.boundingBox())!.y).toBe((await relatedSystem.boundingBox())!.y);
  expect((await priority.boundingBox())!.y).toBeGreaterThan((await category.boundingBox())!.y);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${screenshotRoot}/create-ticket/tablet-initial.png`, fullPage: true });

  await page.goto("/#/tickets");
  await expect(page.locator(".my-tickets__table")).toBeVisible();
  await expect(page.locator("th.my-tickets__system-column")).toBeHidden();
  await expect(page.locator("th.my-tickets__updated-column")).toBeHidden();
  await expect(page.locator("td.my-tickets__system-column")).toBeHidden();
  await expect(page.locator("td.my-tickets__updated-column")).toBeHidden();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${screenshotRoot}/my-tickets/tablet-list.png`, fullPage: true });

  await page.goto("/#/tickets/42");
  await expectGridColumns(page, 2);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${screenshotRoot}/ticket-detail/tablet-detail.png`, fullPage: true });
});

test("RESP-03: mobile layout at 375 × 812 stacks fields and shows ticket cards", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  await page.goto("/#/tickets/new");
  await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
  const category = page.getByLabel("Category");
  const relatedSystem = page.getByLabel("Related System");
  expect((await relatedSystem.boundingBox())!.y).toBeGreaterThan((await category.boundingBox())!.y);
  await expectReachable(page, page.getByRole("button", { name: "Submit Ticket" }));
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${screenshotRoot}/create-ticket/mobile-initial.png`, fullPage: true });

  await page.goto("/#/tickets");
  await expect(page.locator(".my-tickets__table-wrap")).toBeHidden();
  await expect(page.locator(".my-tickets__cards")).toBeVisible();
  await expectReachable(page, page.getByRole("link", { name: "Create Ticket" }));
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${screenshotRoot}/my-tickets/mobile-cards.png`, fullPage: true });

  await page.goto("/#/tickets/42");
  await expectGridColumns(page, 1);
  await expectReachable(page, page.getByRole("button", { name: "Add Attachment" }));
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${screenshotRoot}/ticket-detail/mobile-detail.png`, fullPage: true });
});

test("RESP-04: mobile navigation opens and keeps requester and primary navigation reachable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#/tickets");

  const menuButton = page.locator(".app-header__menu");
  await expect(menuButton).toBeVisible();
  await expect(page.getByTitle(requester.name)).toBeVisible();
  await menuButton.click();

  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expectReachable(page, navigation.getByRole("link", { name: "Create Ticket" }));
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${screenshotRoot}/my-tickets/mobile-navigation.png`, fullPage: true });
});
