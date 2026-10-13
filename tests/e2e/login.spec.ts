import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, screenshot } from "./helpers";

test.describe("Hyrja", () => {
  test("renders the Albanian invitation-only login screen", async ({ page }, testInfo) => {
    await page.goto("/hyrje");
    await expect(page).toHaveTitle("Hyrja · AL STORE");
    await expect(page.locator("html")).toHaveAttribute("lang", "sq-XK");
    await expect(page.getByRole("heading", { name: "Hyrja", level: 1 })).toBeVisible();
    await expect(page.getByLabel("Email-i")).toBeVisible();
    await expect(page.getByLabel("Fjalëkalimi")).toBeVisible();
    await expect(page.getByText("Nuk ka regjistrim publik.", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: /regjistrohu/i })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await screenshot(page, testInfo, "hyrje");
  });

  test("shows Albanian field errors for an empty submit", async ({ page }) => {
    await page.goto("/hyrje");
    await page.getByRole("button", { name: "Hyr" }).click();
    await expect(page.getByText("Shkruani email-in.")).toBeVisible();
    await expect(page.getByText("Shkruani fjalëkalimin.")).toBeVisible();
    await expect(page.getByLabel("Email-i")).toHaveAttribute("aria-invalid", "true");
  });

  test("never signs in: valid credentials get an honest refusal", async ({ page }, testInfo) => {
    await page.goto("/hyrje");
    await page.getByLabel("Email-i").fill("test@example.com");
    await page.getByLabel("Fjalëkalimi").fill("synthetic-password");
    await page.getByLabel("Fjalëkalimi").press("Enter");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Hyrja nuk është aktivizuar ende.",
    );
    await expect(page).toHaveURL(/\/hyrje$/);
    await expect(page.getByLabel("Email-i")).toHaveValue("test@example.com");
    await expect(page.getByLabel("Fjalëkalimi")).toHaveValue("");
    await screenshot(page, testInfo, "hyrje-refuzim");
  });

  test("is keyboard operable", async ({ page }) => {
    await page.goto("/hyrje");
    await page.getByLabel("Email-i").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Fjalëkalimi")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Hyr" })).toBeFocused();
  });
});
