import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;

const mobile = (width: number, height: number) => ({
  ...devices["Pixel 7"],
  viewport: { width, height },
});

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "sq-XK",
    timezoneId: "Europe/Belgrade",
    trace: "retain-on-failure",
    // Optional override for environments whose preinstalled Chromium differs from the pinned
    // Playwright build (e.g. a CI or agent sandbox). Unset → Playwright's own browser.
    ...(process.env.PW_CHROMIUM_EXECUTABLE
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_EXECUTABLE } }
      : {}),
  },
  projects: [
    {
      name: "desktop-1440",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile-360", use: mobile(360, 780) },
    { name: "mobile-375", use: mobile(375, 812) },
    { name: "mobile-430", use: mobile(430, 932) },
  ],
  webServer: {
    // Recreates the local synthetic E2E database (scripts/e2e-db.mjs), then builds and starts.
    command: `node scripts/e2e-db.mjs && npm run build && npm run start -- --port ${PORT} --hostname 127.0.0.1`,
    url: `${baseURL}/hyrje`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: {
      APP_ENV: "development",
      UI_PREVIEW: "true",
      // Local trust-auth cluster only; synthetic ids from scripts/e2e-db.mjs.
      DATABASE_URL: `postgres://alstore_app@127.0.0.1:${process.env.ALSTORE_PG_PORT ?? "54329"}/alstore_e2e`,
      DEV_PREVIEW_DIRECTOR_ID: "00000000-0000-4000-8000-00000000d001",
      DEV_PREVIEW_ACCOUNTANT_ID: "00000000-0000-4000-8000-00000000a001",
    },
  },
});
