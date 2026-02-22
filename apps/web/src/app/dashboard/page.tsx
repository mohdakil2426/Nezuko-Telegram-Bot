"use client"

/**
 * Dashboard Page
 * Main dashboard with stats, chart, activity feed, and quick insights
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatCards, VerificationChart, ActivityFeed } from "@/components/dashboard";
import {
  BotHealthChart,
  CacheBreakdownChart,
  VerificationDistributionChart,
} from "@/components/charts";
import { motion } from "@/components/motion-client";

export default function DashboardPage() {
  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
    >
      <motion.div 
        className="flex items-center justify-between"
        variants={{
          hidden: { opacity: 0, y: 15 },
          show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
        }}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your Nezuko bot dashboard.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/analytics">
            View Full Analytics
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </motion.div>

      <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }}>
        <StatCards />
      </motion.div>

      <motion.div 
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-7"
        variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }}
      >
        <div className="lg:col-span-4">
          <VerificationChart />
        </div>
        <div className="lg:col-span-3">
          <ActivityFeed />
        </div>
      </motion.div>

      {/* Quick Insights Section */}
      <motion.div 
        className="space-y-4"
        variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Quick Insights</h2>
            <p className="text-sm text-muted-foreground">Key performance metrics at a glance</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/analytics">
              See all charts
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <BotHealthChart />
          <CacheBreakdownChart />
          <VerificationDistributionChart />
        </div>
      </motion.div>
    </motion.div>
  );
}
