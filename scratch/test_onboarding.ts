import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Create a dummy user
  const userId = `dummy_${Date.now()}`;
  const user = await prisma.user.create({
    data: {
      id: userId,
      email: `test_${Date.now()}@example.com`,
      name: "Test User",
      role: 'OWNER'
    }
  });
  console.log('Created User:', user.id);

  // 2. Call transaction logic of onboardFarmer
  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // Find if there is an existing placeholder/default farm created during signup
      const placeholderFarm = await tx.farm.findFirst({
        where: {
          userId: userId,
          capacity: 0,
          location: ''
        }
      });

      let farm;
      if (placeholderFarm) {
        farm = await tx.farm.update({
          where: { id: placeholderFarm.id },
          data: {
            name: "Test Farm",
            location: "Test Location",
            capacity: 1000
          }
        });
      } else {
        farm = await tx.farm.create({
          data: {
            name: "Test Farm",
            location: "Test Location",
            capacity: 1000,
            userId: userId
          }
        });
      }

      // Assign/ensure the user is OWNER of this farm in farmMember
      const existingMember = await tx.farmMember.findFirst({
        where: { farmId: farm.id, userId: userId }
      });

      if (!existingMember) {
        await tx.farmMember.create({
          data: {
            farmId: farm.id,
            userId: userId,
            role: 'OWNER'
          }
        });
      }

      // Ensure the User's role is updated to OWNER
      await tx.user.update({
        where: { id: userId },
        data: { role: 'OWNER' }
      });

      // Ensure default FarmSettings exist for this farm
      const existingSettings = await tx.farmSettings.findUnique({
        where: { farmId: farm.id }
      });

      if (!existingSettings) {
        await tx.farmSettings.create({
          data: {
            farmId: farm.id,
            currency: 'GHS',
            eggsPerCrate: 30
          }
        });
      }

      return farm;
    });

    console.log('Onboarding Succeeded! Farm:', result);
  } catch (error) {
    console.error('Onboarding Failed with error:', error);
  } finally {
    // Cleanup dummy user
    await prisma.farmSettings.deleteMany({
      where: { farm: { userId } }
    });
    await prisma.farmMember.deleteMany({
      where: { userId }
    });
    await prisma.farm.deleteMany({
      where: { userId }
    });
    await prisma.user.delete({
      where: { id: userId }
    });
    console.log('Cleanup completed.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
