type RateLimitInput = {
  scope: string;
  userId?: string | null;
  farmId?: string | null;
  ip?: string | null;
  limit?: number;
  windowSec?: number;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
  key: string;
};

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function buildKey(input: RateLimitInput) {
  const principal = input.userId || input.ip || "anonymous";
  const farm = input.farmId || "global";
  return `rl:${input.scope}:${farm}:${principal}`;
}

async function consumeMemoryLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const now = nowSeconds();
  const current = memoryStore.get(key);

  if (!current || now >= current.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSec });
    return { ok: true, remaining: limit - 1, retryAfterSec: windowSec, key };
  }

  const nextCount = current.count + 1;
  current.count = nextCount;
  memoryStore.set(key, current);

  const retryAfterSec = Math.max(1, current.resetAt - now);
  return {
    ok: nextCount <= limit,
    remaining: Math.max(0, limit - nextCount),
    retryAfterSec,
    key,
  };
}

async function consumeUpstashLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return consumeMemoryLimit(key, limit, windowSec);
  }

  const pipelineUrl = `${url}/pipeline`;
  const body = [
    ["INCR", key],
    ["TTL", key],
    ["EXPIRE", key, String(windowSec), "NX"],
  ];

  const response = await fetch(pipelineUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    return consumeMemoryLimit(key, limit, windowSec);
  }

  const json = (await response.json()) as Array<{ result: number | null }>;
  const count = Number(json?.[0]?.result ?? 0);
  const ttl = Number(json?.[1]?.result ?? windowSec);
  const retryAfterSec = ttl > 0 ? ttl : windowSec;

  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSec,
    key,
  };
}

export async function checkRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const limit = input.limit ?? 10;
  const windowSec = input.windowSec ?? 30;
  const key = buildKey(input);
  return consumeUpstashLimit(key, limit, windowSec);
}

