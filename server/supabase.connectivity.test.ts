import { describe, expect, it } from "vitest";

describe("Supabase configuration", () => {
  it("can reach the configured Supabase REST endpoint", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;

    expect(url, "VITE_SUPABASE_URL is required").toMatch(/^https:\/\/[^/]+\.supabase\.co\/?$/);
    expect(key, "VITE_SUPABASE_ANON_KEY is required").toBeTruthy();

    const response = await fetch(`${url!.replace(/\/$/, "")}/rest/v1/`, {
      headers: { apikey: key!, Authorization: `Bearer ${key!}` },
    });

    expect(response.status).toBeLessThan(500);
  }, 15_000);
});
