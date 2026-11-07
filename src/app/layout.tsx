import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";
import { validateEnv } from "@/lib/env-check";
import "./globals.css";
import { NO_FLASH_SCRIPT } from "@/components/layout/theme-script";

// Fail fast on missing runtime config unless CI explicitly skips validation.
validateEnv();

export const metadata: Metadata = {
  title: "Poultry Ledger | Enterprise Farm Management System",
  description: "Next-generation multi-species livestock management platform. Track performance, inventory, and health for Poultry, Cattle, and Pigs with precision.",
  keywords: ["Poultry Ledger", "Farm Management", "Poultry PMS", "Livestock Tracking", "Agriculture Software"],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents auto-zoom on input focus in iOS
};

import AuthProvider from "@/components/providers/SessionProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        </head>
        <body className="antialiased bg-page min-h-screen text-fg font-sans">
          <AuthProvider>
          {children}
          <Toaster richColors position="top-right" theme="dark" />
          <SpeedInsights />
          </AuthProvider>
        </body>
      </html>
  );
}
