import { describe, it, expect, vi, beforeEach } from "vitest";

describe("rate limiter", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  });

  it("allows requests in development mode", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { checkRateLimit } = await import("../rate-limit");

    const result = await checkRateLimit({ policy: "auth.signup", scope: "test-key" });

    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(result.limit);
  });
});
