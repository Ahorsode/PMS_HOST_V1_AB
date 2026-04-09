const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$queryRaw`SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'farms';`;
  console.log('RLS Status:', result);
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
