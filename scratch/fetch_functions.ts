
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const res = await (prisma as any).$queryRawUnsafe("SELECT routine_name, routine_definition FROM information_schema.routines WHERE routine_name IN ('log_new_insertion', 'log_deletion')")
  console.log(JSON.stringify(res, null, 2))
}
main()
