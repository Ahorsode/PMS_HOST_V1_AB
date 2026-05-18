process.env.DATABASE_URL = "postgresql://postgres:184423@localhost:5432/PFMS?schema=public";

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log('Users in DB:', JSON.stringify(users, null, 2));

    const farms = await prisma.farm.findMany();
    console.log('Farms in DB:', JSON.stringify(farms, null, 2));

    const members = await prisma.farmMember.findMany();
    console.log('Farm Members in DB:', JSON.stringify(members, null, 2));

    const permissions = await prisma.userPermission.findMany();
    console.log('User Permissions in DB:', JSON.stringify(permissions, null, 2));

  } catch (error) {
    console.error('Error querying DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
