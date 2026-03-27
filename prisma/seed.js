const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const userId = 'user_clerk_123'

  // 1. Ensure a user exists
  const user = await prisma.user.upsert({
    where: { email: 'ahors@example.com' },
    update: {},
    create: {
      id: 'user_placeholder',
      email: 'ahors@example.com',
      name: 'Farmer John',
      phoneNumber: '+1234567890',
      role: 'OWNER',
    },
  })

  // 2. Create a Farm
  const farm = await prisma.farm.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Green Valley Poultry',
      location: '123 Farm Road, Rural County',
      capacity: 50000,
      userId: user.id
    },
  })

  // 3. Create a Farm Member (Owner)
  await prisma.farmMember.upsert({
    where: { farmId_userId: { farmId: farm.id, userId: user.id } },
    update: {},
    create: {
      farmId: farm.id,
      userId: user.id,
      role: 'OWNER'
    }
  })

  // 4. Create two Poultry Houses
  const house1 = await prisma.house.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      farmId: farm.id,
      name: 'H-01',
      capacity: 10000,
      currentTemperature: 28.5,
      currentHumidity: 65,
      userId: user.id
    },
  })

  const house2 = await prisma.house.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      farmId: farm.id,
      name: 'H-02',
      capacity: 15000,
      currentTemperature: 27.8,
      currentHumidity: 62,
      userId: user.id
    },
  })

  // 5. Create a Broiler Batch
  const batch = await prisma.batch.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      houseId: house1.id,
      farmId: farm.id,
      breedType: 'Broiler',
      initialCount: 5000,
      currentCount: 4950,
      arrivalDate: new Date('2026-03-01'),
      status: 'active',
      userId: user.id
    },
  })

  // 6. Create Feed Inventory
  await prisma.inventory.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      itemName: 'Starter Feed',
      stockLevel: 1200.50,
      unit: 'kg',
      userId: user.id,
      farmId: farm.id
    },
  })

  await prisma.inventory.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      itemName: 'Grower Feed',
      stockLevel: 450.00,
      unit: 'kg',
      userId: user.id,
      farmId: farm.id
    },
  })

  // 7. Add some logs
  await prisma.mortality.create({
    data: {
      batchId: batch.id,
      count: 10,
      logDate: new Date(),
      userId: user.id,
      farmId: farm.id
    }
  })

  console.log('Seeding completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
