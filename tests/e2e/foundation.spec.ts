import { expect, test } from "@playwright/test";

const configured = !!process.env.TEST_SUPABASE_URL && !!process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
test("fresh setup is honest, usable at phone width, and protects private pages", async ({ page }) => {
  test.skip(configured, "This scenario checks an unconfigured fresh checkout.");
  await page.goto("/today");
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByRole("heading", { name: "Let’s give Hagen a home." })).toBeVisible();
  await expect(page.getByText("No account or health records have been created by this setup screen.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("sign-in, profile persistence, failed saves and sign-out", async ({ page }) => {
  test.skip(!configured || process.env.HAGEN_ALLOW_TEST_WRITES !== "true", "Requires a dedicated test project and explicit test-write opt-in.");
  const email = process.env.TEST_USER_A_EMAIL;
  const password = process.env.TEST_USER_A_PASSWORD;
  if (!email || !password) throw new Error("Set credentials for a confirmed disposable account A.");
  await page.goto("/today");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  // Fresh accounts can complete actual onboarding here; DB-test accounts are already onboarded.
  await expect(page).toHaveURL(/\/(onboarding|today)$/);
  if (page.url().endsWith("/onboarding")) {
    await page.getByLabel("What should we call you?").fill("Browser test");
    await page.getByRole("checkbox", { name: /I’ve checked/ }).check();
    await page.getByRole("button", { name: "Save my starting plan" }).click();
  }
  await expect(page).toHaveURL(/\/today$/);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  const field = page.getByLabel("What should we call you?");
  const name = `Test ${Date.now()}`;
  await field.fill(name);
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Profile saved" })).toBeVisible();
  await page.reload();
  await expect(field).toHaveValue(name);
  await field.fill("Unsent draft");
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) await route.abort("failed");
    else await route.continue();
  });
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Your entries are still here");
  await expect(field).toHaveValue("Unsent draft");
  await page.unroute("**/*");
  await page.reload();
  await expect(field).toHaveValue(name);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: `Hello, ${name}.` })).toBeVisible();
});
