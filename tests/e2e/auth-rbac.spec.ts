import { expect, type Page, test } from "@playwright/test";

const dashboardTimeout = 60_000;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

async function loginAs(page: Page, email: string) {
  const csrfResponse = await page.request.get("/api/auth/csrf");
  expect(csrfResponse.ok()).toBe(true);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const loginResponse = await page.request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email,
      password: "Password@123",
      callbackUrl: `${baseURL}/dashboard`,
      json: "true",
    },
  });

  expect(loginResponse.ok()).toBe(true);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: dashboardTimeout });
}

test("redirects anonymous dashboard users to login", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login/);
});

test("admin can access management controls", async ({ page }) => {
  await loginAs(page, "admin@ethara.dev");
  await expect(page.getByRole("button", { name: "New project" })).toBeVisible({
    timeout: dashboardTimeout,
  });
  await expect(page.getByRole("button", { name: "Add member" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New task" })).toBeVisible();
});

test("member cannot access admin controls", async ({ page }) => {
  await loginAs(page, "member@ethara.dev");
  await expect(page.getByRole("button", { name: "New project" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add member" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New task" })).toHaveCount(0);
});

test("project APIs reject unauthenticated requests", async ({ request }) => {
  const response = await request.get("/api/projects");

  expect(response.status()).toBe(401);
});
