process.env.DATABASE_URL = "postgresql://postgres:184423@localhost:5432/PFMS?schema=public";

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Check if RLS is enabled on expenses
    const rlsStatus = await prisma.$queryRaw`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relname = 'expenses';
    `;
    console.log('RLS Status on expenses:', JSON.stringify(rlsStatus, null, 2));

    // 2. Check existing policies on expenses
    const policies = await prisma.$queryRaw`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'expenses';
    `;
    console.log('Policies on expenses:', JSON.stringify(policies, null, 2));

  } catch (error) {
    console.error('Error checking RLS:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
