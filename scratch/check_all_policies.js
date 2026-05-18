process.env.DATABASE_URL = "postgresql://postgres:184423@localhost:5432/PFMS?schema=public";

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const policies = await prisma.$queryRaw`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      ORDER BY tablename, policyname;
    `;
    console.log('All Policies:', JSON.stringify(policies, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
