import { expect, test } from "@playwright/test";

test("food CRUD, reload, draft retry, completion invalidation, copying, and library snapshots", async ({ page }) => {
  test.skip(!process.env.TEST_SUPABASE_URL || !process.env.TEST_SUPABASE_PUBLISHABLE_KEY || process.env.HAGEN_ALLOW_TEST_WRITES !== "true", "Requires the disposable test provider and both migrations.");
  const email = process.env.TEST_USER_A_EMAIL, password = process.env.TEST_USER_A_PASSWORD;
  if (!email || !password) throw new Error("Set disposable account A credentials.");
  const tag = `Food browser ${Date.now()}`;
  const date = "2000-01-01";
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/today$/);
  await page.goto(`/food/entry?date=${date}&category=lunch`);
  await page.getByLabel("Food or meal name").fill(tag);
  await page.getByLabel("Total calories (kcal)").fill("1250");
  await page.getByLabel("Total protein (g)").fill("90");
  // Ordinary navigation and reload retain the actual unsent form.
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await page.goto(`/food/entry?date=${date}&category=lunch`);
  await expect(page.getByLabel("Food or meal name")).toHaveValue(tag);
  await page.reload();
  await expect(page.getByLabel("Total calories (kcal)")).toHaveValue("1250");
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) await route.abort("failed");
    else await route.continue();
  });
  await page.getByRole("button", { name: "Add food to diary", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Your entries are still here");
  await expect(page.getByLabel("Food or meal name")).toHaveValue(tag);
  await page.unroute("**/*");
  await page.getByRole("button", { name: "Add food to diary", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/food\\?date=${date}$`));
  let entry = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: tag, exact: true }) });
  await expect(entry).toHaveCount(1);
  await expect(entry).toContainText("1,250 kcal");
  await page.reload();
  await expect(entry).toContainText("90 g protein");
  await page.getByLabel("I’ve logged everything I ate for this day.").check();
  await page.getByRole("button", { name: "Mark diary complete", exact: true }).click();
  await expect(page.getByRole("heading", { name: "This diary is complete." })).toBeVisible();
  await entry.getByRole("link", { name: "Edit", exact: true }).click();
  await page.getByLabel("Total calories (kcal)").fill("1500");
  await page.getByRole("button", { name: "Save food changes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Finished logging this day?" })).toBeVisible();
  await page.goto(`/today?date=${date}`);
  await expect(page.getByRole("region", { name: "Daily nutrition summary" })).toContainText("1,500");
  await page.goto(`/food?date=${date}`);
  const lunch = page.getByRole("region", { name: "Lunch entries" });
  await lunch.getByText("Copy or save this meal", { exact: true }).click();
  await lunch.getByLabel("Copy lunch to date").fill("2000-01-02");
  await lunch.getByRole("button", { name: "Copy lunch", exact: true }).click();
  await expect(lunch.getByRole("status").filter({ hasText: "Meal copied" })).toBeVisible();
  await page.goto("/food?date=2000-01-02");
  await expect(page.getByRole("link", { name: tag, exact: true })).toHaveCount(1);

  // A label definition edit must not change its already logged nutrition.
  await page.goto(`/food/library/food?date=${date}`);
  await page.getByLabel("Food or meal name").fill(`${tag} label`);
  await page.getByLabel("Label calories (kcal)").fill("200");
  await page.getByLabel("Label protein (g)").fill("10");
  await page.getByRole("button", { name: "Save reusable food" }).click();
  const definition = page.getByRole("listitem").filter({ hasText: `${tag} label` });
  await definition.getByRole("link", { name: "Log food", exact: true }).click();
  await page.getByLabel("Diary date").fill(date);
  await page.getByLabel("Amount eaten (g)").fill("150");
  await page.getByRole("button", { name: "Add food to diary", exact: true }).click();
  entry = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: `${tag} label`, exact: true }) });
  await expect(entry).toContainText("300 kcal");
  await page.goto(`/food/library?date=${date}`);
  await definition.getByRole("link", { name: "Edit", exact: true }).click();
  await page.getByLabel("Label calories (kcal)").fill("999");
  await page.getByRole("button", { name: "Save reusable food" }).click();
  await page.goto(`/food?date=${date}`);
  await expect(entry).toContainText("300 kcal");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await entry.getByText("Delete", { exact: true }).click();
  await entry.getByRole("checkbox").check();
  await entry.getByRole("button", { name: "Delete food entry" }).click();
  await expect(entry).toHaveCount(0);
  // Synthetic records deliberately remain in disposable test account A for
  // inspection. Delete the disposable Auth account after reviewing the run.
});
