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
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // On login, set from user object
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.activeFarmId = (user as any).activeFarmId;
      }
      
      // If activeFarmId is missing from token (e.g. user onboarded after login)
      // refresh it from the database on every request
      if (token.id && !token.activeFarmId) {
        try {
          const membership = await prisma.farmMember.findFirst({
            where: { userId: token.id as string },
            select: { farmId: true }
          });
          if (membership?.farmId) {
            token.activeFarmId = membership.farmId;
          }
        } catch (err) {
          console.error('[JWT] Failed to refresh activeFarmId:', err);
        }
      }
      
      return token;
    },
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

        return null;
      }
    }),
  ],
});

