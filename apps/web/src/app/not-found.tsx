"use client";

import Link from "next/link";
import { m } from "motion/react";
import { Ghost, Home, ArrowLeft, Zap } from "lucide-react";
import { MagneticButton } from "@/components/ui/magnetic-button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Floating Orbs Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <m.div
          className="absolute w-96 h-96 rounded-full bg-primary/20 blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ top: "10%", left: "10%" }}
        />
        <m.div
          className="absolute w-64 h-64 rounded-full bg-purple-500/20 blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          style={{ bottom: "20%", right: "15%" }}
        />
        <m.div
          className="absolute w-48 h-48 rounded-full bg-red-500/10 blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 100, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          style={{ top: "50%", right: "30%" }}
        />
      </div>

      {/* Content */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center px-4"
      >
        {/* Logo */}
        <m.div
          className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 backdrop-blur-xl border border-primary/20 flex items-center justify-center mb-8"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Zap className="w-10 h-10 text-primary" />
        </m.div>

        {/* 404 Text */}
        <m.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="mb-4"
        >
          <h1 className="text-8xl md:text-9xl font-black bg-linear-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent text-balance">
            404
          </h1>
        </m.div>

        {/* Ghost Icon */}
        <m.div
          className="mx-auto mb-6 w-16 h-16 rounded-full bg-muted/50 backdrop-blur-xl border border-border flex items-center justify-center"
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Ghost className="w-8 h-8 text-muted-foreground" />
        </m.div>

        {/* Title */}
        <m.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl md:text-3xl font-bold text-foreground mb-3"
        >
          Page Not Found
        </m.h2>

        {/* Description */}
        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground max-w-md mx-auto mb-8"
        >
          The page you&apos;re looking for has vanished into the digital void. It might have been
          moved, deleted, or never existed in the first place.
        </m.p>

        {/* Action Buttons */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <MagneticButton
            variant="primary"
            className="px-6 py-3"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </MagneticButton>
          <Link href="/dashboard">
            <MagneticButton variant="secondary" className="px-6 py-3 w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </MagneticButton>
          </Link>
        </m.div>

        {/* Decorative code snippet */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 font-mono text-sm text-muted-foreground/50"
        >
          <code className="glass px-4 py-2 rounded-lg">
            Error: Route not found in Nezuko dashboard
          </code>
        </m.div>
      </m.div>
    </div>
  );
}
