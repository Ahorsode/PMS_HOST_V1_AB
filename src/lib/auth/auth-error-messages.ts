// Friendly copy for the NextAuth error codes that reach /auth-error.
// v5 sends every non-client-safe failure (InvalidCheck, adapter errors,
// callback throws) as `Configuration`, so that message covers the common
// "sign-in was interrupted" case rather than blaming the server.

export type AuthErrorCopy = {
  title: string
  message: string
}

const DEFAULT_COPY: AuthErrorCopy = {
  title: 'Sign-in failed',
  message: 'Something went wrong while signing you in. Please try again.',
}

const AUTH_ERROR_COPY: Record<string, AuthErrorCopy> = {
  Configuration: {
    title: "We couldn't finish signing you in",
    message:
      'Your sign-in was interrupted before it completed. This can happen if it took too long or was started on a different web address. Please try again.',
  },
  AccessDenied: {
    title: 'Access denied',
    message:
      'This account is not allowed to sign in. Google accounts need a verified email address. If you were invited, use the email your farm owner invited.',
  },
  Verification: {
    title: 'Link expired',
    message: 'This sign-in link has expired or has already been used. Please request a new one.',
  },
  OAuthSignin: {
    title: "Couldn't reach Google",
    message: 'We could not start Google sign-in. Please try again.',
  },
  OAuthCallback: {
    title: "Couldn't finish Google sign-in",
    message: 'Google sent back a response we could not use. Please try again.',
  },
  OAuthCallbackError: {
    title: "Couldn't finish Google sign-in",
    message: 'Google sign-in was cancelled or did not complete. Please try again.',
  },
  OAuthCreateAccount: {
    title: "Couldn't create your account",
    message: 'We could not create an account from your Google profile. Please try again.',
  },
  EmailCreateAccount: {
    title: "Couldn't create your account",
    message: 'We could not create your account. Please try again.',
  },
  Callback: {
    title: "Couldn't finish signing in",
    message: 'We could not complete the sign-in request. Please try again.',
  },
  OAuthAccountNotLinked: {
    title: 'Account already exists',
    message:
      'An account with this email already exists. Sign in with the method you used before, or the email your administrator invited.',
  },
  AccountNotLinked: {
    title: 'Account already exists',
    message:
      'An account with this email already exists. Sign in with the method you used before, or the email your administrator invited.',
  },
  EmailSignin: {
    title: "Couldn't send the email",
    message: 'We could not send the sign-in email. Please try again.',
  },
  CredentialsSignin: {
    title: 'Incorrect details',
    message: 'That phone number, email or password is not correct. Please check and try again.',
  },
  MissingCSRF: {
    title: 'Page expired',
    message: 'The sign-in page was open too long. Please go back and try again.',
  },
  SessionRequired: {
    title: 'Please sign in',
    message: 'You need to be signed in to view that page.',
  },
  WebAuthnVerificationError: {
    title: "Couldn't verify your device",
    message: 'We could not verify your passkey. Please try again.',
  },
  Default: DEFAULT_COPY,
}

export function getAuthErrorCopy(code: string | null | undefined): AuthErrorCopy {
  if (!code || !Object.hasOwn(AUTH_ERROR_COPY, code)) return DEFAULT_COPY
  return AUTH_ERROR_COPY[code]
}
