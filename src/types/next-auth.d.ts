import NextAuth, { type DefaultSession, type DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      activeFarmId?: number;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: string;
    activeFarmId?: number;
  }
}
