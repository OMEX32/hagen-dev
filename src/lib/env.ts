export function publicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
  } catch { return null; }
  return { url, key };
}

export function appOrigin() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value) throw new Error("Set NEXT_PUBLIC_APP_URL in your environment: .env.local for local development, or project environment variables for Vercel.");
  const url = new URL(value);
  if (url.pathname !== "/" || url.search || url.hash || url.username || url.password ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new Error("App URL must be an HTTPS origin (HTTP localhost is allowed).");
  }
  return url.origin;
}
