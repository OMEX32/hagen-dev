import { expect, test, type Page } from "@playwright/test";
const configured = !!process.env.TEST_SUPABASE_URL && !!process.env.TEST_SUPABASE_PUBLISHABLE_KEY && process.env.HAGEN_ALLOW_TEST_WRITES === "true";
async function login(page: Page, account: "A" | "B") {
  const email = process.env["TEST_USER_" + account + "_EMAIL"], password = process.env["TEST_USER_" + account + "_PASSWORD"];
  if (!email || !password) throw new Error("Set confirmed disposable account " + account + " credentials.");
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/(onboarding|today)$/);
  if (page.url().endsWith("/onboarding")) {
    await page.getByLabel("What should we call you?").fill("Training test " + account);
    await page.getByRole("checkbox", { name: /I’ve checked/ }).check();
    await page.getByRole("button", { name: "Save my starting plan" }).click();
  }
  await expect(page).toHaveURL(/\/today$/);
}
async function prepare(page: Page, kind: "strength" | "walk") {
  await page.goto("/training/routine");
  if (await page.getByRole("heading", { name: "Your starting routine", exact: true }).isVisible()) {
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) await page.getByLabel(day + " activity", { exact: true }).selectOption(kind);
    await page.getByRole("button", { name: "Save routine", exact: true }).click();
    await expect(page).toHaveURL(/\/training$/);
  } else await page.goto("/training");
  const activity = page.locator("section.card").filter({ has: page.getByRole("heading", { name: "Activity", exact: true }) });
  await expect(activity).toContainText(kind === "strength" ? "Strength" : "Walk");
  // These dedicated test accounts must begin without a routine, or retain the
  // all-strength (A) / all-walk (B) routine seeded by a previous browser run.
  const open = activity.getByRole("button", { name: "Open activity", exact: true });
  if (await open.isVisible()) await open.click();
  else await activity.getByRole("link").click();
  await expect(page).toHaveURL(/\/training\/session\?id=/);
  const reopen = page.getByRole("button", { name: "Reopen activity", exact: true });
  if (await reopen.isVisible()) {
    await page.getByLabel("Reopen this activity for editing", { exact: true }).check();
    await reopen.click();
  } else {
    const start = page.getByRole("button", { name: "Start activity", exact: true });
    if (await start.isVisible()) await start.click();
  }
  await expect(page.getByText("In progress", { exact: false }).first()).toBeVisible();
}
test("strength save/retry/resume, per-side input, deadline timer and explicit completion/skip", async ({ page }) => {
  test.skip(!configured, "Requires all migrations and dedicated disposable A/B accounts.");
  await login(page, "A"); await prepare(page, "strength");
  const sessionUrl = page.url(), tag = "Workout " + Date.now();
  const squat = page.locator("section.card").filter({ has: page.getByRole("heading", { name: "Chair squat", exact: true }) });
  await squat.getByLabel("Variation performed", { exact: true }).fill(tag);
  await squat.getByLabel("Reps / first side", { exact: true }).nth(0).fill("8");
  await squat.getByLabel("I completed this set", { exact: true }).nth(0).check();
  await squat.getByLabel("I completed this set", { exact: true }).nth(1).uncheck();
  await squat.getByLabel("Reps / first side", { exact: true }).nth(1).fill("");
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) await route.abort("failed");
    else await route.continue();
  });
  await squat.getByRole("button", { name: "Save exercise", exact: true }).click();
  await expect(squat.getByRole("alert")).toContainText("Your entries are still here");
  await expect(squat.getByLabel("Variation performed", { exact: true })).toHaveValue(tag);
  await page.unroute("**/*");
  await squat.getByRole("button", { name: "Save exercise", exact: true }).click();
  await expect(squat.getByText("This tab has unsent input.", { exact: false })).toHaveCount(0);
  await page.reload();
  await expect(squat.getByLabel("Variation performed", { exact: true })).toHaveValue(tag);
  await expect(squat.getByLabel("I completed this set", { exact: true }).nth(0)).toBeChecked();
  await expect(squat.getByLabel("I completed this set", { exact: true }).nth(1)).not.toBeChecked();
  const bird = page.locator("section.card").filter({ has: page.getByRole("heading", { name: "Bird dog", exact: true }) });
  await bird.getByLabel("Reps / first side", { exact: true }).nth(0).fill("6");
  await bird.getByLabel("Other side reps", { exact: true }).nth(0).fill("6");
  await bird.getByLabel("I completed this set", { exact: true }).nth(0).check();
  await bird.getByRole("button", { name: "Save exercise", exact: true }).click();
  const notes = page.locator("section.card").filter({ has: page.getByRole("heading", { name: "Session notes", exact: true }) });
  await notes.getByLabel("Notes (optional)", { exact: true }).fill(tag);
  await notes.getByLabel("Pain or discomfort (optional)", { exact: true }).fill("Saved discomfort note");
  await notes.getByRole("button", { name: "Save session notes", exact: true }).click();
  await page.clock.install({ time: new Date() });
  await page.getByRole("button", { name: "Rest 90s", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText(/^1:[0-3]\d$/);
  await page.reload();
  await expect(page.getByRole("timer")).toHaveText(/^1:[0-3]\d$/);
  await page.clock.fastForward(95_000);
  await expect(page.getByRole("timer")).toHaveText("0:00");
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await page.getByRole("link", { name: "Resume activity", exact: true }).click();
  await expect(page).toHaveURL(sessionUrl);
  await expect(notes.getByLabel("Notes (optional)", { exact: true })).toHaveValue(tag);
  await page.getByLabel("Finish this activity; leave any unfinished sets as unfinished", { exact: true }).check();
  await page.getByRole("button", { name: "Complete activity", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Activity completed", exact: true })).toBeVisible();
  await expect(squat).toContainText("Unfinished");
  await page.getByLabel("Reopen this activity for editing", { exact: true }).check();
  await page.getByRole("button", { name: "Reopen activity", exact: true }).click();
  await page.getByText("Skip this activity", { exact: true }).click();
  await page.getByLabel("Mark this activity skipped", { exact: true }).check();
  await page.getByRole("button", { name: "Skip activity", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Activity skipped", exact: true })).toBeVisible();
  await expect(squat).toContainText(tag);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page, "A");
  await page.goto(sessionUrl);
  await expect(page.getByRole("heading", { name: "Activity skipped", exact: true })).toBeVisible();
  await expect(page.getByText("Saved discomfort note", { exact: false })).toBeVisible();
});
test("scheduled walking persists actual duration, then routine edits preserve its snapshot", async ({ page }) => {
  test.skip(!configured, "Requires all migrations and dedicated disposable A/B accounts.");
  await login(page, "B"); await prepare(page, "walk");
  const sessionUrl = page.url();
  const movement = page.locator("section.card").filter({ has: page.getByRole("heading", { name: "Actual movement", exact: true }) });
  await movement.getByLabel("Actual duration, minutes", { exact: true }).fill("23");
  await movement.getByLabel("Distance, km (optional)", { exact: true }).fill("");
  await movement.getByLabel("Pain or discomfort (optional)", { exact: true }).fill("Walking discomfort note");
  await movement.getByRole("button", { name: /^(Save activity|Save activity changes)$/ }).click();
  await page.reload();
  await expect(movement.getByLabel("Actual duration, minutes", { exact: true })).toHaveValue("23");
  await page.getByLabel("Finish this activity; leave any unfinished sets as unfinished", { exact: true }).check();
  await page.getByRole("button", { name: "Complete activity", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Activity completed", exact: true })).toBeVisible();
  await page.goto("/training/routine");
  await page.getByLabel("Monday activity", { exact: true }).selectOption("rest");
  await page.getByRole("button", { name: "Save routine", exact: true }).click();
  await expect(page).toHaveURL(/\/training$/);
  await page.goto(sessionUrl);
  await expect(page.getByRole("heading", { name: "Walk", exact: true })).toBeVisible();
  await expect(movement).toContainText("23 min");
  await expect(movement).toContainText("Walking discomfort note");
  await page.goto("/today");
  const activity = page.locator("section.card").filter({ has: page.getByRole("heading", { name: "Activity", exact: true }) });
  await expect(activity).toContainText("23 walking minutes recorded");
  await expect(activity).toContainText("Completed");
  // Additional movement has its own editable/deletable record.
  await page.goto("/training/cardio?date=2000-01-01");
  await page.getByLabel("Actual duration, minutes", { exact: true }).fill("30");
  await page.getByLabel("Notes (optional)", { exact: true }).fill("Extra browser walk");
  await page.getByRole("button", { name: "Save activity", exact: true }).click();
  await expect(page).toHaveURL(/\/training\?date=2000-01-01$/);
  const records = page.locator("section.card").filter({ has: page.getByRole("heading", { name: "Recorded movement", exact: true }) });
  await records.getByRole("listitem").last().getByRole("link", { name: /Review/ }).click();
  await page.getByLabel("Actual duration, minutes", { exact: true }).fill("31");
  await page.getByRole("button", { name: "Save activity changes", exact: true }).click();
  await expect(page).toHaveURL(/\/training\?date=2000-01-01$/);
  await expect(records.getByRole("listitem").last()).toContainText("31 min");
  await records.getByRole("listitem").last().getByRole("link", { name: /Review/ }).click();
  await page.getByLabel("Delete this activity permanently", { exact: true }).check();
  await page.getByRole("button", { name: "Delete activity", exact: true }).click();
  await expect(page).toHaveURL(/\/training\?date=2000-01-01$/);
  await expect(records).not.toContainText("31 min");
});
