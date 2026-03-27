import { PrismaClient } from '@prisma/client'

async function testIsolation() {
  const prisma = new PrismaClient()
  console.log('--- Starting Farm-Isolation Test ---')

  try {
    // 0. Cleanup any previous failed runs
    console.log('Pre-test cleanup...')
    await prisma.batch.deleteMany({ where: { farmId: { in: [1001, 1002] } } })
    await prisma.house.deleteMany({ where: { farmId: { in: [1001, 1002] } } })
    await prisma.farmMember.deleteMany({ where: { farmId: { in: [1001, 1002] } } })
    await prisma.farm.deleteMany({ where: { id: { in: [1001, 1002] } } })

    // 1. Create Test Users
    console.log('Creating users...')
    const userA = await prisma.user.upsert({
      where: { email: 'userA@test.com' },
      update: {},
      create: { email: 'userA@test.com', name: 'User A' }
    })
    const userB = await prisma.user.upsert({
      where: { email: 'userB@test.com' },
      update: {},
      create: { email: 'userB@test.com', name: 'User B' }
    })

    // 2. Create Test Farms
    console.log('Creating farms and memberships...')
    const farmA = await prisma.farm.create({
      data: { id: 1001, name: 'Farm A', userId: userA.id, capacity: 1000 }
    })
    await prisma.farmMember.create({
      data: { farmId: farmA.id, userId: userA.id, role: 'OWNER' }
    })

    const farmB = await prisma.farm.create({
      data: { id: 1002, name: 'Farm B', userId: userB.id, capacity: 2000 }
    })
    await prisma.farmMember.create({
      data: { farmId: farmB.id, userId: userB.id, role: 'OWNER' }
    })

    // 3. Create Houses
    console.log('Creating houses...')
    const houseA = await prisma.house.create({
      data: { 
        id: 1001, 
        name: 'House A', 
        farmId: farmA.id, 
        userId: userA.id, 
        capacity: 1000 
      }
    })
    const houseB = await prisma.house.create({
      data: { 
        id: 1002, 
        name: 'House B', 
        farmId: farmB.id, 
        userId: userB.id, 
        capacity: 2000 
      }
    })

    // --- SETUP SESSION FOR USER A ---
    console.log(`Setting session context for User A (Farm 1001)`)
    await prisma.$executeRawUnsafe(`SET app.current_user_id = '${userA.id}';`)
    await prisma.$executeRawUnsafe(`SET app.current_farm_id = '1001';`)

    // 4. Add Data to Farm A
    console.log('Creating data in Farm A...')
    const batchA = await prisma.batch.create({
      data: {
        farmId: farmA.id,
        userId: userA.id,
        houseId: houseA.id,
        breedType: 'Test Batch A',
        initialCount: 500,
        currentCount: 500,
        arrivalDate: new Date(),
        status: 'active'
      }
    })
    console.log(`Created Batch A (ID: ${batchA.id}) in Farm A (ID: ${farmA.id})`)

    // 5. Test Isolation via RLS Session Variable
    console.log('\nTesting RLS Isolation...')
    
    // Set session to User B / Farm B
    console.log(`Setting session context for User B (Farm 1002)`)
    await prisma.$executeRawUnsafe(`SET app.current_user_id = '${userB.id}';`)
    await prisma.$executeRawUnsafe(`SET app.current_farm_id = '1002';`)

    console.log('Attempting to find batches for User B...')
    const visibleBatchesForB = await prisma.batch.findMany()
    console.log(`Found ${visibleBatchesForB.length} batches visible to User B.`)

    const foundAInB = visibleBatchesForB.some(b => b.id === batchA.id)

    if (foundAInB) {
      console.error('❌ FAILURE: User B can see Farm A data via RLS!')
    } else {
      console.log('✅ SUCCESS: User B cannot see Farm A data via RLS.')
    }

    // 6. Cleanup
    console.log('\nCleaning up test data...')
    await prisma.$executeRawUnsafe(`RESET app.current_farm_id;`)
    await prisma.$executeRawUnsafe(`RESET app.current_user_id;`)
    await prisma.batch.deleteMany({ where: { farmId: { in: [1001, 1002] } } })
    await prisma.house.deleteMany({ where: { farmId: { in: [1001, 1002] } } })
    await prisma.farmMember.deleteMany({ where: { farmId: { in: [1001, 1002] } } })
    await prisma.farm.deleteMany({ where: { id: { in: [1001, 1002] } } })
    console.log('Cleanup completed.')

  } catch (error: any) {
    console.error('Test script failed with error:', error.message || error)
  } finally {
    await prisma.$disconnect()
  }
}

testIsolation()
