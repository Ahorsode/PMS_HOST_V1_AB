import React from 'react';
import { getAuthContext } from '@/lib/auth-utils';
import prisma from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { User, Mail, Shield, Building, Calendar, Download, Trash2, FileText } from 'lucide-react';
import { EditProfileButton } from '@/components/profile/EditProfileButton';
import { formatRoleLabel } from '@/lib/navigation-permissions';
import { LegalLinks } from '@/components/legal/LegalPage';
import { accountDeletionMailto, DELETION_COMPLETION_DAYS } from '@/lib/legal';

export default async function ProfilePage() {
  const { userId, activeFarmId, role, isFarmOwner } = await getAuthContext();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { farmId: activeFarmId },
        include: { farm: true }
      }
    }
  });

  const membership = user?.memberships[0];
  const farm = membership?.farm;

  return (
    <div className="max-w-4xl mx-auto space-y-7 px-0 md:px-3 pt-2 pb-11 md:py-11">
      {/* Hero card */}
      <div>
         <div className="flex flex-col items-center gap-6 rounded-xl border border-white/[0.08] bg-[#19191b] p-6 md:flex-row">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/[0.08] bg-[#232325]">
               <User className="h-8 w-8 text-[#85858b]" strokeWidth={1.5} />
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-2">
               <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
                  <h1 className="text-3xl font-medium leading-tight text-[#ededed]">{user?.name || 'Farm user'}</h1>
                  <span className="self-center text-sm text-[#a1a1a6]">{formatRoleLabel(role)}</span>
               </div>
               <p className="flex items-center justify-center gap-2 text-sm text-[#a1a1a6] md:justify-start">
                  <Mail className="h-4 w-4 text-[#85858b]" strokeWidth={1.5} /> {user?.email}
               </p>
               <p className="pt-1 font-mono text-xs text-[#85858b]">
                  Member since {user?.createdAt.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
               </p>
            </div>

            <div className="flex flex-col gap-2 w-full md:w-auto">
               <EditProfileButton 
                 initialData={{
                   firstname: user?.firstname || '',
                   middleName: user?.middleName || '',
                   surname: user?.surname || ''
                 }} 
               />
            </div>
         </div>
      </div>

      {/* Farm Organization Card (full-width, no license card) */}
      <Card className="bg-black/20 border-white/5 overflow-hidden">
         <CardHeader className="border-b border-white/5 bg-white/[0.02]">
            <CardTitle className="text-sm font-medium text-[#a1a1a6] flex items-center gap-2">
               <Building className="w-4 h-4" /> Farm organization
            </CardTitle>
         </CardHeader>
         <CardContent className="pt-7 pb-9 space-y-5">
            <div className="space-y-3">
               <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                     <Building className="w-5 h-5 text-[#a1a1a6]" />
                  </div>
                  <div>
                     <p className="text-xs font-medium text-white/70">Entity name</p>
                     <p className="text-lg font-medium text-white">{farm?.name}</p>
                  </div>
               </div>

               <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                     <Calendar className="w-5 h-5 text-[#85858b]" />
                  </div>
                  <div>
                     <p className="text-xs font-medium text-white/70">Location</p>
                     <p className="text-sm font-medium text-white/80">{farm?.location || 'Not Specified'}</p>
                  </div>
               </div>
            </div>
         </CardContent>
      </Card>

      <Card className="bg-black/20 border-white/5 overflow-hidden">
         <CardHeader className="border-b border-white/5 bg-white/[0.02]">
            <CardTitle className="text-sm font-medium text-[#ededed] flex items-center gap-2">
               <FileText className="w-4 h-4" /> Your data
            </CardTitle>
         </CardHeader>
         <CardContent className="pt-7 pb-7 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
               <div>
                  <p className="font-medium text-white">Download my data</p>
                  <p className="text-sm text-white/75">
                     {isFarmOwner
                        ? 'A JSON file with your account details and every record of this farm.'
                        : 'A JSON file with your account details. Farm records belong to the farm owner.'}
                  </p>
               </div>
               <a
                  href="/api/account/export"
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-medium text-[#ededed] hover:bg-white/[0.04]"
               >
                  <Download className="h-4 w-4" /> Download
               </a>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
               <div>
                  <p className="font-medium text-white">Delete my account</p>
                  <p className="text-sm text-white/75">
                     Sends us a deletion request from your email app. We delete your personal data within {DELETION_COMPLETION_DAYS} days
                     {isFarmOwner ? ", together with this farm's records" : ''}. Download your data first if you want a copy.
                  </p>
               </div>
               <a
                  href={accountDeletionMailto(userId)}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-medium text-[#f2777b] hover:bg-white/[0.04]"
               >
                  <Trash2 className="h-4 w-4" /> Request deletion
               </a>
            </div>

            <LegalLinks className="border-t border-white/5 pt-5 text-sm text-white/70" />
         </CardContent>
      </Card>
    </div>
  );
}
