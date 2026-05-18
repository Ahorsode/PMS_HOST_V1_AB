process.env.DATABASE_URL = "postgresql://postgres:184423@localhost:5432/PFMS?schema=public";

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const rlsStatus = await prisma.$queryRaw`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
      ORDER BY relname;
    `;
    console.log('RLS Status on all tables:', JSON.stringify(rlsStatus, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
