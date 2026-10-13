import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, isMobile, screenshot, uniq } from "./helpers";

const PHASE = "phase-04";
const shot = (page: Page, info: TestInfo, name: string) => screenshot(page, info, name, PHASE);

async function switchRole(page: Page, to: "Kontabilisti" | "Drejtori") {
  const button = page.getByRole("button", { name: `Kalo te ${to}` });
  if (await button.isVisible()) await button.click();
  await expect(page.getByRole("note").first()).toContainText(`Vepron si ${to}`);
}

async function upload(page: Page, name: string, content: string) {
  await page
    .getByLabel("Skedari")
    .first()
    .setInputFiles({
      name,
      mimeType: "text/csv",
      buffer: Buffer.from(content, "utf8"),
    });
}

test.describe("Importi, gjendja fillestare dhe kalimi (Phase 04)", () => {
  test("pages fit every viewport and keep large touch targets", async ({ page }, info) => {
    for (const [href, heading, name] of [
      ["/stoku/importi", "Importi i produkteve", "importi-lista"],
      ["/stoku/gjendja-fillestare", "Gjendja fillestare", "gjendja-fillestare"],
      ["/cilesimet/kalimi", "Kalimi nga Excel", "kalimi"],
    ] as const) {
      await page.goto(href);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      const heights = await page
        .getByRole("main")
        .locator(
          "input:not([type=hidden]):not([type=checkbox]):not([type=file]), select, textarea, button",
        )
        .evaluateAll((els) =>
          els
            .filter((el) => (el as HTMLElement).offsetParent !== null)
            .map((el) => el.getBoundingClientRect().height),
        );
      for (const h of heights) expect(h).toBeGreaterThanOrEqual(40);
      await shot(page, info, name);
    }
  });

  test("full cutover flow: plan, series, product import, count, reconcile, sign-off", async ({
    page,
  }, info) => {
    test.skip(
      isMobile(info),
      "the single cutover plan of the shared synthetic organization runs once (desktop)",
    );
    test.setTimeout(90_000);
    const tag = uniq();
    const skuA = `CNT-${tag}-A`;
    const skuB = `CNT-${tag}-B`;
    const skuBad = `CNT-${tag}-C`;

    // 1. Cutover plan: a mid-month start needs the accountant's acknowledgement.
    await page.goto("/cilesimet/kalimi");
    await page.getByLabel("Data e fillimit në sistem").fill("2027-01-15");
    await page.getByLabel("Dita e fundit e punës në Excel").fill("2027-01-14");
    await page.getByRole("button", { name: "Ruaj planin" }).click();
    await expect(page.getByText("Fillimi i synuar është ditën e parë të muajit.")).toBeVisible();
    await page.getByLabel("Data e fillimit në sistem").fill("2027-01-01");
    await page.getByLabel("Dita e fundit e punës në Excel").fill("2026-12-31");
    await page.getByRole("button", { name: "Ruaj planin" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Plani i kalimit u ruajt." }),
    ).toBeVisible();
    await expect(page.getByText("Momenti i kalimit: 01.01.2027 00:00")).toBeVisible();

    // 2. Invoice series: the old last number is only valid when the last Excel day is in the same year.
    await page.getByLabel("Kodi i serisë").fill("fa");
    await page.getByLabel("Numri i faturës së fundit të lëshuar").fill("41");
    await page.getByRole("button", { name: "Ruaj propozimin" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Dita e fundit në Excel është në vit tjetër",
    );
    await page.getByLabel("Numri i faturës së fundit të lëshuar").fill("");
    await page.getByLabel("Këtë vit nuk është lëshuar asnjë faturë").check();
    await page.getByRole("button", { name: "Ruaj propozimin" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Asnjë faturë nuk është lëshuar." }),
    ).toBeVisible();
    await expect(page.getByText("2027 · FA")).toBeVisible();
    await shot(page, info, "kalimi-plani-seria");

    // 3. Product import: dry run shows errors, nothing exists, then reviewed partial approval.
    await page.goto("/stoku/importi");
    await upload(
      page,
      "produkte.csv",
      [
        "SKU;Emri;Kategoria;Njesia",
        `${skuA};Profil numërimi A ${tag};Alumin;kg`,
        `${skuB};Profil numërimi B ${tag};PVC;m²`,
        `${skuBad};Profil me njësi të gabuar ${tag};PVC;litra`,
      ].join("\n"),
    );
    await page.getByRole("button", { name: "Ngarko dhe shiko parashikimin" }).click();
    await expect(page).toHaveURL(/\/stoku\/importi\/[0-9a-f-]{36}\?ruajtur=ngarkuar$/);
    const importUrl = page.url().split("?")[0]!;
    await expect(page.getByText("Ky është vetëm një parashikim: asnjë produkt")).toBeVisible();
    await expect(page.getByText("Miratimi i plotë nuk lejohet.")).toBeVisible();
    await expect(page.getByText(/Vetëm kg, m² ose copë|njësi/i).first()).toBeVisible();
    await shot(page, info, "importi-parashikimi");
    await page.goto(`/stoku/produktet?q=${skuA}`);
    await expect(page.getByText("Asnjë produkt.")).toBeVisible();
    await page.goto(importUrl);

    await page.getByLabel("Shkruani numrin e rreshtave që përjashtohen (1)").fill("1");
    await page.getByRole("button", { name: "Mirato importin" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Importi u miratua: 2 rreshta u zbatuan." }),
    ).toBeVisible();
    await page.goto(`/stoku/produktet?q=CNT-${tag}`);
    await expect(page.getByText(/^2 produkte\.$/)).toBeVisible();

    // 4. Count: one typed line, one uploaded count sheet with a blank (UNKNOWN) quantity.
    await page.goto("/stoku/gjendja-fillestare");
    await page.getByRole("button", { name: "Fillo numërimin fillestar" }).click();
    await expect(page).toHaveURL(/\/stoku\/gjendja-fillestare\/[0-9a-f-]{36}\?ruajtur=krijuar$/);
    const batchUrl = page.url().split("?")[0]!;

    await page.getByLabel(/^SKU/).fill("NUK-EKZISTON");
    await page.getByLabel("Gjendja e numërimit").selectOption("VERIFIED_QTY");
    await page.getByLabel(/Sasia/).fill("5");
    await page.getByRole("button", { name: "Ruaj rreshtin" }).click();
    await expect(page.getByText("Nuk ekziston produkt me këtë SKU.")).toBeVisible();

    await page.getByLabel(/^SKU/).fill(skuA.toLowerCase());
    await page.getByLabel("Gjendja e numërimit").selectOption("VERIFIED_QTY");
    await page.getByLabel(/Sasia/).fill("12,5");
    await page.getByRole("button", { name: "Ruaj rreshtin" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Rreshti i numërimit u ruajt." }),
    ).toBeVisible();
    await expect(page.getByText("12,500 kg")).toBeVisible();

    await upload(page, "numerimi.csv", ["SKU;Njesia;Sasia", `${skuB};m²;`].join("\n"));
    await page.getByRole("button", { name: "Ngarko dhe shiko parashikimin" }).click();
    await expect(page.getByText("Kjo duhet të jetë fleta e numërimit fizik")).toBeVisible();
    await page.getByRole("button", { name: "Mirato importin" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Importi u miratua: 1 rreshta u zbatuan." }),
    ).toBeVisible();
    await page.goto(batchUrl);
    await expect(page.getByText("E panjohur").first()).toBeVisible();
    await shot(page, info, "numerimi-rreshtat");

    await page.getByRole("button", { name: "Numërimi përfundoi" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Numërimi u shënua si i përfunduar." }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Ruaj rreshtin" })).toHaveCount(0);

    // 5. The accountant reconciles with Excel; the director cannot.
    await expect(page.getByText("Rakordimin me Excel-in e bën kontabilisti.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Regjistro rakordimin" })).toHaveCount(0);
    await switchRole(page, "Kontabilisti");
    await page.getByRole("button", { name: "Regjistro rakordimin" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Kontrolloni fushat e shënuara.",
    );
    await page
      .getByLabel("Si u rakordua numërimi me ditën e fundit në Excel?")
      .fill("Sasitë e numëruara u krahasuan me listën e ditës së fundit; nuk u gjet diferencë.");
    await page.getByRole("button", { name: "Regjistro rakordimin" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Rakordimi me Excel-in u regjistrua." }),
    ).toBeVisible();
    await expect(page.getByText("Nënshkrimin e bën drejtori")).toBeVisible();

    // 6. The director signs off; the count of still-unverified products must be confirmed.
    await switchRole(page, "Drejtori");
    const signOff = page.getByRole("button", {
      name: "Nënshkruaj dhe regjistro gjendjen fillestare",
    });
    await signOff.click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Kontrolloni fushat e shënuara.",
    );
    await shot(page, info, "nenshkrimi");
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const label = await page
        .getByText(/Konfirmoni numrin e produkteve pa gjendje të verifikuar: \d+/)
        .first()
        .innerText();
      const count = /(\d+)\s*\*?\s*(\(e detyrueshme\))?$/.exec(
        label.replace(/\s+/g, " ").trim(),
      )?.[1];
      await page.getByLabel(/Konfirmoni numrin e produkteve pa gjendje/).fill(count ?? "0");
      await page
        .getByRole("button", { name: "Nënshkruaj dhe regjistro gjendjen fillestare" })
        .click();
      const done = page
        .getByRole("status")
        .filter({ hasText: "Gjendja fillestare u nënshkrua dhe u regjistrua në stok" });
      if (
        await done.waitFor({ timeout: 6000 }).then(
          () => true,
          () => false,
        )
      )
        break;
      await page.waitForTimeout(500);
    }
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Gjendja fillestare u nënshkrua dhe u regjistrua në stok" }),
    ).toBeVisible();
    await expect(page.getByText("Regjistruar në stok").first()).toBeVisible();
    await shot(page, info, "gjendja-e-regjistruar");

    // 7. Everything is frozen afterwards.
    await expect(page.getByRole("button", { name: "Ruaj rreshtin" })).toHaveCount(0);
    await page.goto("/cilesimet/kalimi");
    await expect(page.getByText("Plani është i mbyllur pas nënshkrimit")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ruaj planin" })).toHaveCount(0);
  });
});
