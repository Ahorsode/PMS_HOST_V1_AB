import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const userId = 'seed_user_id'

  // 1. Create a User (Optional, but good for multi-tenancy)
  const user = await prisma.user.upsert({
    where: { email: 'seed@example.com' },
    update: {},
    create: {
      id: userId,
      email: 'seed@example.com',
      name: 'Seed User',
      role: 'OWNER'
    }
  })

  // 2. Create a Farm
  const farm = await prisma.farm.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Green Valley Poultry',
      location: '123 Farm Road, Rural County',
      capacity: 50000,
      userId
    },
  })

  // 3. Create two Houses
  const house1 = await prisma.house.upsert({
    where: { id: 1 },
    update: {},
    create: {
      farmId: farm.id,
      name: 'H-01',
      capacity: 10000,
      currentTemperature: 28.5,
      currentHumidity: 65,
      userId
    },
  })

  const house2 = await prisma.house.upsert({
    where: { id: 2 },
    update: {},
    create: {
      farmId: farm.id,
      name: 'H-02',
      capacity: 15000,
      currentTemperature: 27.8,
      currentHumidity: 62,
      userId
    },
  })

  // 4. Create a Broiler Batch
  const batch = await prisma.batch.upsert({
    where: { id: 1 },
    update: {},
    create: {
      houseId: house1.id,
      breedType: 'Broiler',
      initialCount: 5000,
      currentCount: 4950,
      arrivalDate: new Date('2026-03-01'),
      status: 'active',
      userId
    },
  })

  // 5. Create Feed Inventory
  await prisma.inventory.upsert({
    where: { id: 1 },
    update: {},
    create: {
      itemName: 'Starter Feed',
      category: 'feed',
      stockLevel: 1200.50,
      unit: 'kg',
      userId
    },
  })

  await prisma.inventory.upsert({
    where: { id: 2 },
    update: {},
    create: {
      itemName: 'Grower Feed',
      category: 'feed',
      stockLevel: 450.00,
      unit: 'kg',
      userId
    },
  })

  // 6. Add some logs
  await prisma.mortality.create({
    data: {
      batchId: batch.id,
      count: 10,
      logDate: new Date(),
      userId
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
