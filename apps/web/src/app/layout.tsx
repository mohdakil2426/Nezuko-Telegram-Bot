import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider, QueryProvider, MotionProvider, InsforgeProvider } from "@/providers";
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
        {/* InsforgeProvider must be outermost client wrapper for auth context */}
        <InsforgeProvider>
          <ThemeProvider>
            <QueryProvider>
              <MotionProvider>{children}</MotionProvider>
              <Toaster />
            </QueryProvider>
          </ThemeProvider>
        </InsforgeProvider>
      </body>
    </html>
  );
}
