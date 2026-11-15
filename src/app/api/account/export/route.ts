import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthContext } from '@/lib/auth-utils';
import { checkRateLimit, rateLimitHeaders } from '@/lib/performance/rate-limit';
import { BRAND_NAME } from '@/lib/brand';

// Per-user download: never prerender or cache it at build time.
export const dynamic = 'force-dynamic';

/**
 * Lets any signed-in user download their personal data. Farm owners also get
 * every record of their active farm. Secrets (password hashes, OAuth and
 * licence tokens, session tokens) are never included.
 */
export async function GET() {
  let context: Awaited<ReturnType<typeof getAuthContext>>;
  try {
    context = await getAuthContext();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { userId, activeFarmId, isFarmOwner } = context;

  const limit = await checkRateLimit({ policy: 'account.export', userId });
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many exports. Please wait a few minutes and try again.' },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  const [user, memberships, legalAcceptances, signIns] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstname: true,
        middleName: true,
        surname: true,
        name: true,
        email: true,
        phoneNumber: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.farmMember.findMany({
      where: { userId },
      select: { farmId: true, role: true, farm: { select: { name: true } } },
    }),
    prisma.legalAcceptance.findMany({
      where: { userId },
      select: { document: true, version: true, method: true, acceptedAt: true },
    }),
    prisma.session.findMany({
      where: { userId },
      select: { loginTime: true, deviceType: true, expires: true },
      orderBy: { loginTime: 'desc' },
    }),
  ]);

  const farm = isFarmOwner && activeFarmId ? await exportFarm(activeFarmId) : null;

  const payload = {
    exportedAt: new Date().toISOString(),
    service: BRAND_NAME,
    account: { user, memberships, legalAcceptances, signIns },
    farm,
    note: farm
      ? undefined
      : 'Farm records are included only for the farm owner. Ask your farm owner for a copy of farm records.',
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="poultry-ledger-export-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}

async function exportFarm(farmId: string) {
  const where = { farmId };
  const [
    farm,
    settings,
    salesSettings,
    members,
    permissions,
    houses,
    livestock,
    eggCategories,
    eggProduction,
    feedingLogs,
    feedFormulations,
    inventory,
    mortality,
    healthRecords,
    isolationRooms,
    medicationSchedules,
    vaccinationSchedules,
    weightRecords,
    customers,
    suppliers,
    sales,
    saleItems,
    orders,
    orderBatchAllocations,
    expenses,
    expenseAllocations,
    financialTransactions,
    subscriptionEvents,
    auditLogs,
    deleteLogs,
  ] = await Promise.all([
    prisma.farm.findUnique({ where: { id: farmId } }),
    prisma.farmSettings.findMany({ where }),
    prisma.salesSettings.findMany({ where }),
    prisma.farmMember.findMany({
      where,
      select: {
        role: true,
        user: { select: { id: true, firstname: true, surname: true, email: true, phoneNumber: true } },
      },
    }),
    prisma.userPermission.findMany({ where }),
    prisma.house.findMany({ where }),
    prisma.livestock.findMany({ where }),
    prisma.eggCategory.findMany({ where }),
    prisma.eggProduction.findMany({ where }),
    prisma.feedingLog.findMany({ where }),
    prisma.feedFormulation.findMany({ where }),
    prisma.inventory.findMany({ where }),
    prisma.healthMortality.findMany({ where }),
    prisma.healthRecord.findMany({ where }),
    prisma.isolationRoom.findMany({ where }),
    prisma.medicationSchedule.findMany({ where }),
    prisma.vaccinationSchedule.findMany({ where }),
    prisma.weightRecord.findMany({ where }),
    prisma.customer.findMany({ where }),
    prisma.supplier.findMany({ where }),
    prisma.sale.findMany({ where }),
    prisma.saleItem.findMany({ where }),
    prisma.order.findMany({ where, include: { items: true } }),
    prisma.orderItemBatchAllocation.findMany({ where }),
    prisma.expense.findMany({ where }),
    prisma.expenseAllocation.findMany({ where }),
    prisma.financialTransaction.findMany({ where }),
    prisma.subscriptionEvent.findMany({ where }),
    prisma.auditLog.findMany({ where }),
    prisma.deleteLog.findMany({ where }),
  ]);

  return {
    farm,
    settings,
    salesSettings,
    members,
    permissions,
    houses,
    livestock,
    eggCategories,
    eggProduction,
    feedingLogs,
    feedFormulations,
    inventory,
    mortality,
    healthRecords,
    isolationRooms,
    medicationSchedules,
    vaccinationSchedules,
    weightRecords,
    customers,
    suppliers,
    sales,
    saleItems,
    orders,
    orderBatchAllocations,
    expenses,
    expenseAllocations,
    financialTransactions,
    subscriptionEvents,
    auditLogs,
    deleteLogs,
  };
}
