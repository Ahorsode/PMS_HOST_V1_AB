import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import { ChooseCountryForm } from './ChooseCountryForm';

export const metadata: Metadata = {
  title: 'Your country | Poultry Ledger',
};

/** One-time step for owners of farms created before every farm had a country. */
export default async function ChooseCountryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const farm = await prisma.farm.findFirst({
    where: { userId: session.user.id, country: null },
    select: { name: true },
  });
  if (!farm) redirect('/dashboard');

  return <ChooseCountryForm farmName={farm.name} />;
}
