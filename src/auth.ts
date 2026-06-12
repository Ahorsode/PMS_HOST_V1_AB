import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from './auth.config';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { normalizePhoneNumber, recordUserSession } from '@/lib/auth-utils';

const SECURITY_PERMISSION_UPDATE_MESSAGE = 'Your security permissions have been updated. Please sign in again to activate your new features.';

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
    },
    async signIn({ user }) {
      if (user.id) {
        await recordUserSession(user.id, 'Web');
      }
    }
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      // On login, set from user object
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.activeFarmId = (user as any).activeFarmId;
        token.mustChangePassword = (user as any).mustChangePassword;
        token.sessionVersion = (user as any).sessionVersion ?? 1;
        token.securityInvalidated = false;
        token.securityNotice = null;
      }

      if (trigger === "update" && session) {
        token.mustChangePassword = (session as any).mustChangePassword;
        if ((session as any).name) token.name = (session as any).name;
      }

      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              role: true,
              mustChangePassword: true,
              sessionVersion: true,
              securityNotice: true
            }
          });

          if (dbUser) {
            const tokenVersion = typeof token.sessionVersion === 'number'
              ? token.sessionVersion
              : dbUser.sessionVersion;
            const sessionWasRevoked = tokenVersion < dbUser.sessionVersion;

            token.role = dbUser.role;
            token.mustChangePassword = dbUser.mustChangePassword;

            if (sessionWasRevoked) {
              token.securityInvalidated = true;
              token.securityNotice = dbUser.securityNotice || SECURITY_PERMISSION_UPDATE_MESSAGE;
            } else {
              token.sessionVersion = dbUser.sessionVersion;
              token.securityInvalidated = false;
              token.securityNotice = null;
            }
          }
        } catch (err) {
          console.error('[JWT] Failed to refresh security metadata:', err);
        }
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
        
        let identifier = credentials.identifier as string;
        const password = credentials.password as string;

        // If it's not an email, normalize it as a phone number
        if (!identifier.includes('@')) {
          identifier = normalizePhoneNumber(identifier) || identifier;
        }

        // 1. Look up existing user
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier },
              { phoneNumber: identifier }
            ]
          }
        });

        if (user && user.password) {
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) return null;

          // Fetch active farm
          const membership = await prisma.farmMember.findFirst({
            where: { userId: user.id }
          });
          
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstname} ${user.surname}`,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
            sessionVersion: user.sessionVersion,
            activeFarmId: membership?.farmId
          }; 
        }

        return null;
      }
    }),
  ],
});

