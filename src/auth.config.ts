import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user?.id;
      const mustChangePassword = (auth?.user as any)?.mustChangePassword === true;
      const isProtectedRoute = nextUrl.pathname.startsWith('/dashboard') || nextUrl.pathname.startsWith('/onboarding');
      const isAuthPage = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/signup');
      
      // Force change password if flag is set
      if (isLoggedIn && mustChangePassword && nextUrl.pathname !== '/auth/change-password') {
        return Response.redirect(new URL('/auth/change-password', nextUrl));
      }

      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect to /login
      } else if (isLoggedIn && !mustChangePassword) { // Don't redirect away from auth pages if we MUST change password
        if (isAuthPage || nextUrl.pathname === '/') {
           return Response.redirect(new URL('/dashboard', nextUrl));
        }
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.activeFarmId = (user as any).activeFarmId;
        token.mustChangePassword = (user as any).mustChangePassword;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).activeFarmId = token.activeFarmId as number;
        (session.user as any).mustChangePassword = token.mustChangePassword as boolean;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
