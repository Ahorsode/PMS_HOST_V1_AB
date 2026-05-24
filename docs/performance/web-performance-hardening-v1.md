# Web Performance Hardening v1 (Next.js + Supabase)

## Production Runtime Configuration

Vercel environment variables are the source of truth.

- `DATABASE_URL` must use Supavisor transaction mode:
  - host: `*.pooler.supabase.com`
  - port: `6543`
  - query param: `pgbouncer=true`
- `DIRECT_URL` is reserved for Prisma CLI/migrations and should remain direct `:5432`.

## Prisma Connection Budgeting

Use explicit `connection_limit` in `DATABASE_URL` for pooled runtime connections.

Recommended sizing formula:

`connection_limit = floor((supabase_pooler_client_budget * safety_factor) / max_concurrent_app_instances)`

Defaults for this project:

- `safety_factor = 0.7` (reserve room for admin/other services)
- initial `connection_limit=5`

Example pooled URL tail:

`...:6543/postgres?pgbouncer=true&connection_limit=5`

## Caching Policy

- Heavy aggregate metrics: `revalidate: 60`
- Hot operational lists: `revalidate: 15`
- Cache tags:
  - `farm:{farmId}:dashboard`
  - `farm:{farmId}:analytics`
  - `farm:{farmId}:reports`

Mutation paths revalidate these tags to preserve read-after-write behavior.

## Rate Limiting

Rate limiting is enforced for critical write pathways with key pattern:

`{scope}:{farmId}:{userId}` (or `{scope}:{ip}` for public API routes)

Backend:

- Primary: Upstash Redis via `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- Fallback: in-memory fixed window (dev-safe, not distributed)

API routes return:

- HTTP `429`
- payload with `code: 429` and `retryAfterSec`
- `Retry-After` response header
