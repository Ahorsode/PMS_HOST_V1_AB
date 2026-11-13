import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import { getAuthContext } from '@/lib/auth-utils';
import { ChooseCountryForm } from './ChooseCountryForm';

export const metadata: Metadata = {
  title: 'Your country | Poultry Ledger',
};

/**
 * One-time step for owners of farms created before every farm had a country.
 * It asks about the active farm: the one the dashboard checks and the one
 * setFarmCountry saves, so the answer always lets the owner through.
 */
export default async function ChooseCountryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { activeFarmId } = await getAuthContext();
  const farm = activeFarmId
    ? await prisma.farm.findUnique({ where: { id: activeFarmId }, select: { name: true, userId: true, country: true } })
    : null;
  if (!farm || farm.userId !== session.user.id || farm.country) redirect('/dashboard');

  return <ChooseCountryForm farmName={farm.name} />;
}
