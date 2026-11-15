import { execSync } from "node:child_process";

// Applies pending Prisma migrations during the production build only.
//
// Preview deployments and CI builds never migrate: they would otherwise run
// unmerged migrations against whatever database DATABASE_URL points to.
// Set MIGRATE_ON_BUILD=true to opt in elsewhere (e.g. a staging project).
//
// A failed migration stops the deploy. It is never marked as applied
// automatically; fix it and resolve it by hand with
// `prisma migrate resolve --rolled-back <name>` (or `--applied` once verified).

const shouldMigrate =
  process.env.VERCEL_ENV === "production" || process.env.MIGRATE_ON_BUILD === "true";

if (!shouldMigrate) {
  console.log(
    `[prisma-deploy] Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}). ` +
      "Set MIGRATE_ON_BUILD=true to run them in this environment.",
  );
  process.exit(0);
}

try {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  console.log("[prisma-deploy] Migrations up to date");
} catch {
  console.error(
    "[prisma-deploy] prisma migrate deploy failed. The deploy was stopped so a " +
      "half-applied migration is not hidden. Inspect _prisma_migrations, fix the " +
      "migration, then resolve it manually before redeploying.",
  );
  process.exit(1);
}
