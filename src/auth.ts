import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from './auth.config';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

function splitName(name: string | null | undefined) {
  if (!name) return { firstname: '', surname: '', middleName: '' };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstname: parts[0], surname: '', middleName: '' };
  if (parts.length === 2) return { firstname: parts[0], surname: parts[1], middleName: '' };
  return {
    firstname: parts[0],
    surname: parts[parts.length - 1],
    middleName: parts.slice(1, -1).join(' ')
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  events: {
    async createUser({ user }) {
      if (user.name) {
        const { firstname, surname, middleName } = splitName(user.name);
        await (prisma.user as any).update({
          where: { id: user.id },
          data: { firstname, surname, middleName } as any
        });
      }
    }
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        identifier: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;
        
        const identifier = credentials.identifier as string;
        const password = credentials.password as string;

        // 1. Look up existing user
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier },
              { phoneNumber: identifier }
            ]
          }
        });

        if (user && (user as any).password) {
          const isValid = await bcrypt.compare(password, (user as any).password);
          if (!isValid) return null;

          // Fetch active farm
          const membership = await prisma.farmMember.findFirst({
            where: { userId: user.id }
          });
          
          return {
            ...user,
            activeFarmId: membership?.farmId
          } as any; 
        }

        // 2. Check invitations if user not found or needs registration
        // (Simplified: Registration should happen separately, but for now we follow old logic)
        const invitation = await prisma.invitation.findFirst({
          where: { 
            OR: [
              { email: identifier },
              { phoneNumber: identifier }
            ], 
            status: 'PENDING' 
          }
        });

        // Invitations usually don't have passwords yet, so we might need a registration flow.
        // For now, if there's an invitation but no user, we might allow initial sign-in to create account?
        // Actually, the user said "New users signing up ... should input their password".
        // This implies a signup form. 

        return null;
      }
    }),
  ],
});
