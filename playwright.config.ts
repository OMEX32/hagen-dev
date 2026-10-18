import { defineConfig, devices } from "@playwright/test";

const configured = !!process.env.TEST_SUPABASE_URL && !!process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3100", trace: "off", screenshot: "off", video: "off" },
  projects: [
    { name: "mobile-chromium", use: { ...devices["Pixel 7"], viewport: { width: 360, height: 780 } } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/setup",
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100",
      NEXT_PUBLIC_SUPABASE_URL: configured ? process.env.TEST_SUPABASE_URL! : "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: configured ? process.env.TEST_SUPABASE_PUBLISHABLE_KEY! : "",
    },
  },
});
