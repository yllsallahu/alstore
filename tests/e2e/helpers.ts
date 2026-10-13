import { expect, type Page, type TestInfo } from "@playwright/test";

export async function screenshot(page: Page, testInfo: TestInfo, name: string, phase = "phase-01") {
  await page.screenshot({
    path: `docs/screenshots/${phase}/${testInfo.project.name}-${name}.png`,
    fullPage: true,
  });
}

/** Short random suffix so parallel projects never collide on unique values. */
export const uniq = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

export function isMobile(testInfo: TestInfo) {
  return testInfo.project.name.startsWith("mobile");
}
