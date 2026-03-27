import React from 'react';
import { getHouses } from '@/lib/actions/dashboard-actions';
import HousesContent from './HousesContent';

export default async function HousesPage() {
  const houses = await getHouses();

  return <HousesContent houses={houses} />;
}
