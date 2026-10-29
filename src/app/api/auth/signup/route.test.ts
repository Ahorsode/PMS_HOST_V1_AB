import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindFirst: vi.fn(),
  invitationFindFirst: vi.fn(),
  transaction: vi.fn(),
  txUserCreate: vi.fn(),
  txUserUpdate: vi.fn(),
  txFarmCreate: vi.fn(),
  txFarmMemberCreate: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: {
    user: { findFirst: mocks.userFindFirst },
    invitation: { findFirst: mocks.invitationFindFirst },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/performance/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  getRateLimitIp: () => "203.0.113.1",
  rateLimitHeaders: () => ({}),
}));

import { POST } from "./route";

function signup(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

describe("signup route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.invitationFindFirst.mockResolvedValue(null);
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        user: { create: mocks.txUserCreate, update: mocks.txUserUpdate },
        farm: { create: mocks.txFarmCreate },
        farmMember: { create: mocks.txFarmMemberCreate },
        invitation: { update: vi.fn() },
      }),
    );
    mocks.txUserCreate.mockResolvedValue({ id: "new-user", firstname: "Ama", surname: "", email: null, phoneNumber: "+233554101675", mustChangePassword: false });
    mocks.txFarmCreate.mockResolvedValue({ id: "farm-1" });
  });

  it.each([
    ["a Google-only user without a password", { id: "victim", password: null, mustChangePassword: false }],
    ["an invited worker who has not activated", { id: "victim", password: "hash", mustChangePassword: true }],
    ["a fully registered user", { id: "victim", password: "hash", mustChangePassword: false }],
  ])("never modifies %s", async (_label, existingUser) => {
    mocks.userFindFirst.mockResolvedValue(existingUser);

    const response = await signup({
      firstname: "Attacker",
      email: "attacker@example.com",
      phoneNumber: "0554101675",
      password: "a-strong-password",
    });

    expect(response.status).toBe(409);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.txUserUpdate).not.toHaveBeenCalled();
  });

  it("creates a new owner with their own farm", async () => {
    mocks.userFindFirst.mockResolvedValue(null);

    const response = await signup({
      firstname: "Ama",
      phoneNumber: "0554101675",
      password: "a-strong-password",
    });

    expect(response.status).toBe(201);
    expect(mocks.txUserCreate).toHaveBeenCalledOnce();
    expect(mocks.txFarmCreate).toHaveBeenCalledOnce();
  });
});
