import { type DefaultSession, type DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      activeFarmId?: string;
      mustChangePassword?: boolean;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: string;
    activeFarmId?: string;
    mustChangePassword?: boolean;
  }
}
