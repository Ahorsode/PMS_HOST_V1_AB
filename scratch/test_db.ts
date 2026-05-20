import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Recent Users:', users);

  const farms = await prisma.farm.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Recent Farms:', farms);

  const farmMembers = await prisma.farmMember.findMany({
    take: 5
  });
  console.log('Recent Farm Members:', farmMembers);
}

main().catch(console.error).finally(() => prisma.$disconnect());
