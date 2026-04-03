const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const livestock = await prisma.livestock.findMany({ select: { id: true, batchName: true, initialCostActual: true } })
  console.log("LIVESTOCK:", livestock)

  const expenses = await prisma.expense.findMany()
  console.log("EXPENSES:", expenses)
  console.log("TOTAL EXPENSES=", expenses.length)

  // Wait, let's sync them up. If a livestock has initial costs but no corresponding expense:
  // (Assuming we just create them directly to fix the DB state)
  let count = 0;
  for (const batch of livestock) {
    if (batch.initialCostActual && batch.initialCostActual > 0) {
      // check if expense exists
      const existing = expenses.filter(e => e.amount.toString() === batch.initialCostActual.toString() || e.description?.includes(batch.batchName));
      if (existing.length === 0) {
        console.log(`Fixing missing expense for batch ${batch.id}`);
        // Let's create it for the user... but we lack farmId and userId in this simple query.
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
