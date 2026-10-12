import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  lab4Fixtures,
  responsiveActionDescription,
  responsiveTicketDescription,
} from "./prepare-fixtures";

const password = process.env.TOKTICKIT_E2E_PASSWORD ?? "ChangeMe123!";
const accounts = {
  requester:
    process.env.TOKTICKIT_E2E_LAB4_REQUESTER ??
    "e2e.lab4.requester@example.com",
  staff: process.env.TOKTICKIT_E2E_LAB4_STAFF ?? "e2e.lab4.staff@example.com",
  administrator:
    process.env.TOKTICKIT_E2E_LAB4_ADMIN ?? "e2e.lab4.admin@example.com",
};
const screenshotRoot = resolve("artifacts/lab-04/screenshots");
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
  { name: "small-mobile", width: 320, height: 568 },
] as const;

type Role = "requester" | "staff" | "administrator";

function screenshotPath(
  role: Role,
  screen: string,
  width: number,
  height: number,
) {
  const directory = resolve(screenshotRoot, role);
  mkdirSync(directory, { recursive: true });
  return resolve(directory, `${screen}-${width}x${height}.png`);
}

async function login(page: Page, email: string, path: string) {
  await page.goto(path);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: /password/i }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function assertNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function assertReachable(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(
    (page.viewportSize()?.width ?? 1440) + 1,
  );
}

for (const viewport of viewports) {
  test.describe(`${viewport.width}×${viewport.height} Lab 4 responsive layouts`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("Requester Dashboard and read-only Actions Taken remain reachable", async ({
      page,
    }) => {
      const { requesterTicketId } = lab4Fixtures();
      await login(page, accounts.requester, "#/dashboard");
      await expect(
        page.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
      await assertReachable(
        page,
        page.getByRole("link", { name: /Open Tickets/ }),
      );
      await assertReachable(
        page,
        page.getByRole("link", { name: /Recently Resolved/ }).first(),
      );
      await assertNoPageOverflow(page);
      await page.screenshot({
        path: screenshotPath(
          "requester",
          "dashboard",
          viewport.width,
          viewport.height,
        ),
        fullPage: true,
      });

      if (viewport.width < 768) {
        await page
          .getByRole("button", { name: "Open navigation menu" })
          .click();
        const navigation = page.getByRole("navigation", {
          name: "Main navigation",
        });
        await expect(
          navigation.getByRole("link", { name: "My Tickets" }),
        ).toBeVisible();
        await assertReachable(
          page,
          page.getByRole("button", { name: "Logout" }),
        );
      }

      await page.goto(`#/tickets/${requesterTicketId}`);
      await expect(
        page.getByRole("heading", { name: "Ticket Details" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Actions Taken" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Add Action" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /Edit Action/ }),
      ).toHaveCount(0);
      await assertReachable(
        page,
        page.getByRole("button", { name: /View Action/ }).first(),
      );
      await assertReachable(
        page,
        page.getByRole("navigation", { name: "Actions Taken pages" }),
      );
      await assertNoPageOverflow(page);
    });

    test("IT Staff Dashboard, Queue, workflow and Actions Taken adapt without clipping", async ({
      page,
    }) => {
      const { responsiveTicketId } = lab4Fixtures();
      await login(page, accounts.staff, "#/staff/dashboard");
      await expect(
        page.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
      await assertReachable(
        page,
        page.getByRole("link", { name: /My Tickets/ }),
      );
      await assertReachable(
        page,
        page.getByRole("link", { name: /Recently Updated/ }).first(),
      );
      await assertNoPageOverflow(page);
      await page.screenshot({
        path: screenshotPath(
          "staff",
          "dashboard",
          viewport.width,
          viewport.height,
        ),
        fullPage: true,
      });

      await page.getByRole("link", { name: /My Tickets/ }).click();
      await expect(
        page.getByRole("heading", { name: "Ticket Queue" }),
      ).toBeVisible();
      await assertReachable(page, page.getByLabel("Search tickets"));
      await assertReachable(page, page.getByLabel("Status"));
      await assertNoPageOverflow(page);

      await page.goto(`#/staff/tickets/${responsiveTicketId}`);
      await expect(
        page.getByRole("heading", { name: "Ticket Details" }),
      ).toBeVisible();
      await expect(page.getByText(responsiveTicketDescription)).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Workflow" }),
      ).toBeVisible();
      await assertReachable(page, page.getByLabel("Ticket status"));
      await assertReachable(
        page,
        page.getByRole("button", { name: "Save status" }),
      );
      const responsiveActionText =
        viewport.width >= 1200
          ? page
              .locator(".actions-taken__table-wrap")
              .getByText(responsiveActionDescription)
          : page
              .locator(".actions-taken__cards")
              .getByText(responsiveActionDescription);
      await expect(responsiveActionText).toBeVisible();
      await assertReachable(page, responsiveActionText);
      await assertReachable(
        page,
        page.getByRole("button", { name: "Add Action" }),
      );
      await assertReachable(
        page,
        page.getByRole("button", { name: /Edit Action/ }).first(),
      );
      await assertReachable(
        page,
        page.getByRole("navigation", { name: "Actions Taken pages" }),
      );

      if (viewport.width >= 1200) {
        await expect(page.locator(".actions-taken__table-wrap")).toBeVisible();
        await expect(page.locator(".actions-taken__cards")).toBeHidden();
      } else {
        await expect(page.locator(".actions-taken__cards")).toBeVisible();
        await expect(page.locator(".actions-taken__table-wrap")).toBeHidden();
      }
      await page.getByRole("button", { name: "Add Action" }).click();
      await expect(
        page.getByRole("heading", { name: "Add Action" }),
      ).toBeVisible();
      await assertReachable(page, page.getByLabel("Action Description"));
      await assertReachable(
        page,
        page.getByRole("button", { name: "Save Draft" }),
      );
      await assertNoPageOverflow(page);
      await page.screenshot({
        path: screenshotPath(
          "staff",
          "ticket-detail-actions",
          viewport.width,
          viewport.height,
        ),
        fullPage: true,
      });
    });

    test("Administrator operational Dashboard and Ticket Inspection remain usable", async ({
      page,
    }) => {
      const { administratorTicketId } = lab4Fixtures();
      await login(page, accounts.administrator, "#/staff/dashboard");
      await expect(
        page.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
      await assertReachable(
        page,
        page.getByRole("link", { name: /My Tickets/ }),
      );
      await assertNoPageOverflow(page);

      await page.goto(`#/tickets/${administratorTicketId}`);
      await expect(
        page.getByRole("heading", { name: "Ticket Inspection" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Workflow" }),
      ).toBeVisible();
      await assertReachable(page, page.getByLabel("Status"));
      await assertReachable(
        page,
        page.getByRole("button", { name: "Save status" }),
      );
      await assertReachable(
        page,
        page.getByRole("button", { name: "Add Action" }),
      );
      await assertNoPageOverflow(page);
      await page.screenshot({
        path: screenshotPath(
          "administrator",
          "ticket-inspection",
          viewport.width,
          viewport.height,
        ),
        fullPage: true,
      });
    });
  });
}
