import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, signUp, resetPasswordForEmail } = vi.hoisted(() => ({
  createClient: vi.fn(), signUp: vi.fn(), resetPasswordForEmail: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/features/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { authenticate, requestPasswordReset } from "../src/features/auth/actions";

function signupForm() {
  const data = new FormData();
  data.set("mode", "signup");
  data.set("email", "test@example.com");
  data.set("password", "test-password-only");
  return data;
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
  createClient.mockResolvedValue({ auth: { signUp, resetPasswordForEmail } });
  signUp.mockResolvedValue({ data: { session: null }, error: null });
  resetPasswordForEmail.mockResolvedValue({ error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("email-link configuration failures", () => {
  it.each([undefined, "", "hagen.vercel.app", "https://hagen.vercel.app/login", "http://hagen.vercel.app"])(
    "returns a useful signup error for invalid application origin %s without creating an account", async (origin) => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", origin);
      const result = await authenticate(signupForm());
      expect(result.error).toContain("NEXT_PUBLIC_APP_URL");
      expect(createClient).not.toHaveBeenCalled();
      expect(signUp).not.toHaveBeenCalled();
    },
  );
  it("reports missing password-reset configuration without making a provider request", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect((await requestPasswordReset(signupForm())).error).toContain("NEXT_PUBLIC_APP_URL");
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });
  it("builds signup links from the configured HTTPS origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://hagen.example.com/");
    const result = await authenticate(signupForm());
    expect(result.message).toContain("Check your email");
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ options: { emailRedirectTo: "https://hagen.example.com/auth/callback" } }));
  });
  it("keeps the recovery destination on the configured origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://hagen.example.com");
    await requestPasswordReset(signupForm());
    expect(resetPasswordForEmail).toHaveBeenCalledWith("test@example.com", { redirectTo: "https://hagen.example.com/auth/callback?next=/update-password" });
  });
});
