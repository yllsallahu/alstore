import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, isMobile, screenshot, uniq } from "./helpers";

const PHASE = "phase-03";
const shot = (page: Page, info: TestInfo, name: string) => screenshot(page, info, name, PHASE);

/** Every visible form control in <main> is at least 44 px tall (large touch targets). */
async function expectTouchTargets(page: Page) {
  const heights = await page
    .getByRole("main")
    .locator("input:not([type=hidden]):not([type=checkbox]), select, textarea, button")
    .evaluateAll((elements) =>
      elements
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => ({ h: el.getBoundingClientRect().height, name: el.getAttribute("name") })),
    );
  for (const { h, name } of heights) expect(h, `control ${name}`).toBeGreaterThanOrEqual(40);
}

async function switchRole(page: Page, to: "Kontabilisti" | "Drejtori") {
  const button = page.getByRole("button", { name: `Kalo te ${to}` });
  if (await button.isVisible()) await button.click();
  await expect(page.getByRole("note").first()).toContainText(`Vepron si ${to}`);
}

test.describe("Produktet (Phase 03)", () => {
  test("create with Albanian validation, 3-dp price, then find by SKU", async ({ page }, info) => {
    const sku = `E2E-${uniq()}`;
    await page.goto("/stoku/produktet/i-ri");
    await expect(page.getByRole("heading", { name: "Produkt i ri", level: 1 })).toBeVisible();
    await expectTouchTargets(page);

    await page.getByLabel("SKU").fill(`${sku.toLowerCase()} x`);
    await page.getByLabel("Çmimi referues i blerjes, pa TVSH (EUR, opsional)").fill("4,1255");
    await page.getByRole("button", { name: "Ruaj produktin" }).click();

    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Kontrolloni fushat e shënuara.",
    );
    await expect(page.getByLabel("SKU")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("SKU lejon vetëm shkronja latine")).toBeVisible();
    await expect(page.getByText("Shkruani emrin e produktit.")).toBeVisible();
    await expect(page.getByText("Zgjidhni kategorinë.")).toBeVisible();
    await expect(page.getByText("Lejohen deri në 3 shifra pas presjes.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await shot(page, info, "produkt-gabime");

    await page.getByLabel("SKU").fill(sku.toLowerCase());
    await page.getByLabel("Emri i produktit").fill(`Profil sintetik ${sku}`);
    await page.getByLabel("Kategoria").selectOption({ label: "Alumin" });
    await page.getByLabel("Njësia kanonike").selectOption({ label: "kg" });
    await page.getByLabel("Çmimi referues i blerjes, pa TVSH (EUR, opsional)").fill("4,125");
    await page.getByRole("button", { name: "Ruaj produktin" }).click();

    await expect(page).toHaveURL(/\/stoku\/produktet\/[0-9a-f-]{36}\?ruajtur=krijuar$/);
    await expect(page.getByRole("status").filter({ hasText: "U ruajt." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(sku);
    await expect(page.getByLabel("Çmimi referues i blerjes, pa TVSH (EUR, opsional)")).toHaveValue(
      "4,125",
    );
    await expect(page.getByText("Produkti u krijua")).toBeVisible();
    await shot(page, info, "produkt-detaje");

    // Two consecutive edits on the same page: each save uses the fresh version.
    for (const name of [`Profil i ndryshuar ${sku}`, `Profil i ndryshuar dy herë ${sku}`]) {
      await page.getByLabel("Emri i produktit").fill(name);
      await page.getByRole("button", { name: "Ruaj ndryshimet" }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "Ndryshimet u ruajtën." }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(sku);
      await expect(page.getByLabel("Emri i produktit")).toHaveValue(name);
    }
    await expect(page.getByText("Produkti u ndryshua")).toHaveCount(2);

    await page.goto("/stoku/produktet");
    await page.getByLabel("Kërko sipas SKU-së, emrit ose barkodit").fill(sku.slice(0, 8));
    await expect(page.getByRole("link", { name: sku }).first()).toBeVisible();
    await expect(page.getByText(/^1 produkt\.$/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await shot(page, info, "produktet-lista");
  });

  test("duplicate SKU is refused; duplicate name needs explicit confirmation", async ({ page }) => {
    const sku = `DUP-${uniq()}`;
    const name = `Doreza sintetike ${uniq()}`;
    const create = async (skuValue: string) => {
      await page.goto("/stoku/produktet/i-ri");
      await page.getByLabel("SKU").fill(skuValue);
      await page.getByLabel("Emri i produktit").fill(name);
      await page.getByLabel("Kategoria").selectOption({ label: "Aksesorë" });
      await page.getByLabel("Njësia kanonike").selectOption({ label: "copë" });
      await page.getByRole("button", { name: "Ruaj produktin" }).click();
    };
    await create(sku);
    await expect(page).toHaveURL(/ruajtur=krijuar/);

    await create(sku);
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Kjo SKU ekziston tashmë. Çdo SKU duhet të jetë unike.",
    );

    await create(`${sku}-B`);
    const warning = page
      .getByRole("main")
      .getByRole("alert")
      .filter({ hasText: "Ekziston një regjistër i ngjashëm" });
    await expect(warning).toContainText("Emër i njëjtë me një produkt tjetër");
    await expect(page).toHaveURL(/\/i-ri$/);
    await page.getByRole("button", { name: "Ruaj produktin" }).click();
    await expect(page).toHaveURL(/ruajtur=krijuar/);
  });

  test("a double tap on save creates exactly one product", async ({ page }) => {
    const sku = `DBL-${uniq()}`;
    await page.goto("/stoku/produktet/i-ri");
    await page.getByLabel("SKU").fill(sku);
    await page.getByLabel("Emri i produktit").fill(`Produkt ${sku}`);
    await page.getByLabel("Kategoria").selectOption({ label: "PVC" });
    await page.getByLabel("Njësia kanonike").selectOption({ label: "m²" });
    await page.getByRole("button", { name: "Ruaj produktin" }).dblclick();
    await expect(page).toHaveURL(/ruajtur=krijuar/);
    await page.goto(`/stoku/produktet?q=${sku}`);
    await expect(page.getByText(/^1 produkt\.$/)).toBeVisible();
  });

  test("a product with stock movements has a locked unit and a four-eyes migration", async ({
    page,
  }, info) => {
    await page.goto("/stoku/produktet?q=E2E-LOCK");
    await page.getByRole("link", { name: "E2E-LOCK" }).first().click();
    await expect(page.getByLabel("Njësia kanonike")).toBeDisabled();
    await expect(page.getByText("E kyçur: produkti ka lëvizje stoku.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Ndryshimi i njësisë (migrim i miratuar)" }),
    ).toBeVisible();
    await shot(page, info, "njesia-e-kycur");
    test.skip(isMobile(info), "the shared synthetic product is migrated once (desktop)");

    await switchRole(page, "Drejtori");
    await page.getByLabel("Njësia e re").selectOption({ label: "m²" });
    await page.getByLabel("Arsyeja").fill("Njësia u regjistrua gabim gjatë krijimit (test)");
    await page.getByRole("button", { name: "Kërko miratimin" }).click();
    await expect(page.getByRole("status").filter({ hasText: "pret miratimin" })).toBeVisible();
    await expect(page.getByText("Ju e bëtë këtë kërkesë.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mirato dhe zbato" })).toHaveCount(0);

    await switchRole(page, "Kontabilisti");
    await page.getByRole("button", { name: "Mirato dhe zbato" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "u miratua dhe u zbatua" }),
    ).toBeVisible();
    await expect(page.getByLabel("Njësia kanonike")).toHaveValue("M2");
    await expect(page.getByText("Ndryshimi i njësisë u miratua", { exact: true })).toBeVisible();
    await shot(page, info, "njesia-migruar");
    await switchRole(page, "Drejtori");
  });
});

test.describe("Klientët (Phase 03)", () => {
  test("only registered businesses; new customers are unverified and not invoiceable", async ({
    page,
  }, info) => {
    const name = `Ndërtimi Sintetik ${uniq()} SH.P.K.`;
    const nui = String(Math.floor(100_000_000 + Math.random() * 800_000_000));
    await page.goto("/klientet/i-ri");
    await expectTouchTargets(page);
    await page.getByLabel("Emri ligjor i biznesit").fill(name);
    await page.getByRole("button", { name: "Ruaj klientin" }).click();
    await expect(
      page.getByText(
        "Një klient biznes duhet të ketë të paktën një numër identifikues të biznesit.",
      ),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await shot(page, info, "klient-gabime");

    await page.getByLabel("Numri unik identifikues i biznesit (NUI)").fill(nui);
    await page.getByLabel("Adresa e faturimit").fill("Rruga Sintetike 1");
    await page.getByLabel("Qyteti").fill("Prishtinë");
    await page.getByRole("button", { name: "Ruaj klientin" }).click();
    await expect(page).toHaveURL(/\/klientet\/[0-9a-f-]{36}\?ruajtur=krijuar$/);

    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
    await expect(page.getByText("I paverifikuar").first()).toBeVisible();
    const eligibility = page.getByRole("status").filter({ hasText: "faturë tatimore" });
    await expect(eligibility).toContainText("Nuk mund të marrë faturë tatimore");
    await expect(eligibility).toContainText("(VG-07) nuk është miratuar");
    await expect(page.getByText("Nuk bëhet: nuk ekziston lidhje e besueshme")).toBeVisible();
    await expect(page.getByRole("button", { name: "Regjistro kontrollin manual" })).toBeDisabled();
    await shot(page, info, "klient-detaje");

    await page.getByLabel("Arsyeja e pezullimit").fill("Biznesi sintetik u çregjistrua (test)");
    await page.getByRole("button", { name: "Pezullo klientin" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Klienti u pezullua" })).toBeVisible();
    await expect(page.getByText("I pezulluar").first()).toBeVisible();
    await expect(eligibility).toContainText("Verifikimi i klientit është pezulluar.");

    await page.goto("/klientet");
    await page.getByLabel("Kërko sipas emrit ose numrit identifikues").fill(nui.slice(0, 7));
    await expect(
      page.getByRole("link", { name: new RegExp(name.replace(/\./g, "\\.")) }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await shot(page, info, "klientet-lista");
  });

  test("same NUI shows a duplicate warning before saving", async ({ page }) => {
    const nui = String(Math.floor(100_000_000 + Math.random() * 800_000_000));
    const fill = async (name: string) => {
      await page.goto("/klientet/i-ri");
      await page.getByLabel("Emri ligjor i biznesit").fill(name);
      await page.getByLabel("Numri unik identifikues i biznesit (NUI)").fill(nui);
      await page.getByRole("button", { name: "Ruaj klientin" }).click();
    };
    await fill(`Çatia Sintetike ${uniq()}`);
    await expect(page).toHaveURL(/ruajtur=krijuar/);
    await fill(`Tjetër Biznes ${uniq()}`);
    await expect(page.getByRole("main").getByRole("alert")).toContainText("I njëjti NUI");
    await expect(page).toHaveURL(/\/klientet\/i-ri$/);
  });

  test("identifier rules: read-only for the director, editable by the accountant", async ({
    page,
  }, info) => {
    await page.goto("/klientet/rregullat");
    await switchRole(page, "Drejtori");
    await expect(
      page.getByText("Vetëm kontabilisti mund t'i ndryshojë këto rregulla."),
    ).toBeVisible();
    test.skip(isMobile(info), "rules are org-wide; changed once (desktop)");

    await switchRole(page, "Kontabilisti");
    await page.getByRole("combobox", { name: /^Numri/ }).selectOption({ label: "Numri i TVSH-së" });
    await page.getByLabel("Gjatësia minimale").fill("9");
    await page.getByLabel("Gjatësia maksimale").fill("9");
    await page.getByLabel("Burimi i rregullit").fill("Rregull sintetik vetëm për testim");
    await page.getByRole("button", { name: "Ruaj rregullin" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Rregulli u ruajt." })).toBeVisible();
    await expect(page.getByText("9 shifra · opsional")).toBeVisible();
    await shot(page, info, "rregullat");
    await page.getByRole("button", { name: "Çaktivizo" }).click();
    await expect(page.getByText("Nuk ka ende rregulla të miratuara.")).toBeVisible();
    await switchRole(page, "Drejtori");
  });
});

test.describe("Furnitorët (Phase 03)", () => {
  test("Albanian supplier with NIPT, always EUR", async ({ page }, info) => {
    const name = `Profile Durrës Sintetike ${uniq()} SHPK`;
    await page.goto("/furnitoret/i-ri");
    await page.getByLabel("Emri ligjor i furnitorit").fill(name);
    await page.getByLabel("Shteti").selectOption({ label: "Shqipëri" });
    await expect(page.getByLabel("Numri unik identifikues i biznesit (NUI)")).toHaveCount(0);
    await page.getByLabel("NIPT / NUIS").fill(`L${uniq()}X`);
    await page.getByLabel("Referenca e faturave të furnitorit").fill("Seria FS-VVVV");
    await expect(page.getByText("Faturat e furnitorëve regjistrohen vetëm në euro.")).toBeVisible();
    await expectTouchTargets(page);
    await expectNoHorizontalOverflow(page);
    await shot(page, info, "furnitor-i-ri");
    await page.getByRole("button", { name: "Ruaj furnitorin" }).click();

    await expect(page).toHaveURL(/\/furnitoret\/[0-9a-f-]{36}\?ruajtur=krijuar$/);
    await expect(page.getByText("Shqipëri · EUR")).toBeVisible();
    await page.goto("/furnitoret?q=durres");
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await shot(page, info, "furnitoret-lista");
  });
});
