import prisma from '../src/lib/db';

async function main() {
  try {
    // 1. Check if RLS is enabled on expenses
    const rlsStatus = await (prisma as any).$queryRaw`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relname = 'expenses';
    `;
    console.log('RLS Status on expenses:', rlsStatus);

    // 2. Check existing policies on expenses
    const policies = await (prisma as any).$queryRaw`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'expenses';
    `;
    console.log('Policies on expenses:', policies);

  } catch (error) {
    console.error('Error checking RLS:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
