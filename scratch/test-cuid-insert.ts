import prisma from '../src/lib/db'

async function main() {
  console.log('--- Starting CUID Auto-Generation Database Integration Test ---')

  const testFarmId = 'seed_farm_1'
  const testUserId = 'seed_user_id'

  try {
    // 1. Check if seed user and seed farm exist, if not, create them
    console.log('Verifying prerequisite seed data...')
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: 'seed-test@example.com',
        name: 'Seed Test User',
        role: 'OWNER'
      }
    })

    await prisma.farm.upsert({
      where: { id: testFarmId },
      update: {},
      create: {
        id: testFarmId,
        name: 'Integration Test Farm',
        capacity: 10000,
        userId: testUserId
      }
    })

    console.log('Inserting a new Expense record without manually providing an ID column...')
    console.log('This will verify that the newly added client-side @default(cuid()) auto-generates IDs successfully.')

    // 2. Create the expense using Prisma client without passing an id field
    const expense = await prisma.expense.create({
      data: {
        farmId: testFarmId,
        userId: testUserId,
        amount: 250.50,
        category: 'FEED',
        description: 'Integration test expense for CUID verification'
      }
    })

    console.log('✅ SUCCESS: Expense created successfully with auto-generated CUID!')
    console.log('Generated ID:', expense.id)
    console.log('Amount:', Number(expense.amount))
    console.log('Category:', expense.category)

    // 3. Clean up the test expense
    console.log('Cleaning up test expense record...')
    await prisma.expense.delete({
      where: { id: expense.id }
    })
    console.log('✅ Cleanup completed.')

  } catch (error: any) {
    console.error('❌ TEST FAILED with error:', error.message || error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
