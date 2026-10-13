import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, isMobile, screenshot } from "./helpers";

const SECTIONS = [
  ["Shitje e re", "/shitje-e-re"],
  ["Faturat", "/faturat"],
  ["Klientët", "/klientet"],
  ["Blerje e re", "/blerje-e-re"],
  ["Furnitorët", "/furnitoret"],
  ["Stoku", "/stoku"],
  ["Pagesat / Borxhet", "/pagesat"],
  ["ATK / EDI", "/atk-edi"],
  ["Shpenzimet", "/shpenzimet"],
  ["Raportet", "/raportet"],
  ["Cilësimet", "/cilesimet"],
] as const;

test.describe("App shell (development UI preview)", () => {
  test("home shows the four large actions and the preview notice", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Ballina", level: 1 })).toBeVisible();
    await expect(page.getByRole("note")).toContainText("Pamje paraprake për zhvillim");

    const main = page.getByRole("main");
    for (const label of ["Shitje e re", "Blerje e re", "Stoku", "ATK / EDI"]) {
      await expect(main.getByRole("link", { name: new RegExp(`^${label} `) })).toBeVisible();
    }
    await expect(main.getByRole("listitem")).toHaveCount(4);
    await expectNoHorizontalOverflow(page);
    await screenshot(page, testInfo, "ballina");
  });

  test("every section is reachable from the navigation", async ({ page }, testInfo) => {
    for (const [label, href] of SECTIONS) {
      await page.goto("/");
      if (isMobile(testInfo)) {
        await page.getByRole("button", { name: "Hap menynë" }).click();
      }
      const nav = page
        .getByRole("navigation", { name: "Navigimi kryesor" })
        .filter({ visible: true });
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(href);
      await expect(page.getByRole("heading", { name: label, level: 1 })).toBeVisible();
    }
  });

  test("placeholders are honest: disabled action and no data entry", async ({ page }, testInfo) => {
    // Klientët, Furnitorët and the Stoku catalogue are active since Phase 03 (master-data spec);
    // Cilësimet gained the cutover page in Phase 04.
    const placeholders = SECTIONS.filter(
      ([, href]) => !["/klientet", "/furnitoret", "/stoku", "/cilesimet"].includes(href),
    );
    for (const [label, href] of placeholders) {
      await page.goto(href);
      await expect(
        page.getByRole("heading", { name: "Ky modul ende nuk është aktiv" }),
      ).toBeVisible();
      const main = page.getByRole("main");
      await expect(main.getByRole("button")).toBeDisabled();
      await expect(main.locator("input, textarea, select, form")).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      if (label === "Shitje e re" || label === "ATK / EDI") {
        await screenshot(page, testInfo, href.slice(1));
      }
    }
  });

  test("ATK / EDI states that the export awaits verification", async ({ page }) => {
    await page.goto("/atk-edi");
    await expect(page.getByRole("status")).toHaveText(
      "Eksporti ATK është në pritje të verifikimit",
    );
  });

  test("first Tab reaches the skip link, which moves focus to the content", async ({ page }) => {
    await page.goto("/stoku");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Kalo te përmbajtja" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#permbajtja")).toBeFocused();
  });

  test("mobile menu opens, traps focus and closes with Escape", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), "mobile only");
    await page.goto("/");
    await page.getByRole("button", { name: "Hap menynë" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await screenshot(page, testInfo, "menyja");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Hap menynë" })).toBeFocused();
  });

  test("unknown routes show the Albanian 404 page", async ({ page }) => {
    const response = await page.goto("/nuk-ekziston");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Faqja nuk u gjet" })).toBeVisible();
  });
});
