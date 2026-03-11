import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { ThemeProvider, QueryProvider, MotionProvider, InsforgeProviderWrapper } from "@/providers";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nezuko Dashboard",
  description: "Telegram bot management dashboard",
};

// RESP-M1: viewportFit=cover enables env(safe-area-inset-*) CSS variables for iOS notch support
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // themeColor must live here in Next.js 16, not in metadata
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#252525" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* Skip to content — accessibility shortcut for keyboard users */}
        <a
          href="#main-content"
          className="focus:bg-background focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:ring-2 focus:outline-none"
        >
          Skip to content
        </a>
        {/* 
          Suspense enables Partial Prerendering (PPR) for the Root Layout. 
          The html, body, and fonts are prerendered and sent instantly.
          The InsforgeProviderWrapper fetches the auth session dynamically.
        */}
        <Suspense>
          <InsforgeProviderWrapper>
            <ThemeProvider>
              <QueryProvider>
                <MotionProvider>{children}</MotionProvider>
                <Toaster />
              </QueryProvider>
            </ThemeProvider>
          </InsforgeProviderWrapper>
        </Suspense>
      </body>
    </html>
  );
}
