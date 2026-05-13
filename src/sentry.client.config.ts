import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  // Enable browser tracing to see if the "Farm Dashboard" is loading slowly
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  sendDefaultPii: true,
  enableLogs: true,

  integrations: [
    Sentry.replayIntegration(),
    // User Feedback Widget
    // This will show a popup if the site crashes or can be triggered manually
    Sentry.feedbackIntegration({
      // Additional configuration
      colorScheme: "system",
      isNameRequired: true,
      isEmailRequired: true,
      autoInject: true,
      showBranding: false,
      buttonLabel: "Report a Bug",
      submitButtonLabel: "Send Feedback",
      formTitle: "What were you doing when this happened?",
    }),
  ],
});

// Hook into App Router navigation transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
