import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { hasAcceptedCurrentTerms } from '@/lib/legal-acceptance';
import { AcceptTermsForm } from './AcceptTermsForm';

export const metadata: Metadata = {
  title: 'Accept terms | Poultry Ledger',
};

export default async function AcceptTermsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (await hasAcceptedCurrentTerms(session.user.id)) redirect('/dashboard');

  return <AcceptTermsForm />;
}
