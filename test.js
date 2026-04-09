const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const farms = await prisma.farm.findMany({ select: { id: true, userId: true } });
  console.log('FARMS:', farms);
}
main().catch(console.error).finally(() => prisma.$disconnect());
