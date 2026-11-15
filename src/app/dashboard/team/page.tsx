import React from 'react';
import TeamView from './TeamView';
import { checkWorkerPermissions } from '@/lib/actions/staff-actions';
import { redirect } from 'next/navigation';
import { getAppSettings } from '@/lib/settings/app-settings';

export default async function TeamPage() {
  const hasAccess = await checkWorkerPermissions('team', 'view');
  const canEdit = await checkWorkerPermissions('team', 'edit');

  if (!hasAccess) {
    redirect('/dashboard/unauthorized');
  }

  const { rolePermissions } = await getAppSettings('farm-defaults');

  return <TeamView canEdit={canEdit} rolePermissions={rolePermissions} />;
}
