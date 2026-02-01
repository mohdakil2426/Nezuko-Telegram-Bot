"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useTheme } from "next-themes";
import { useThemeConfig } from "@/lib/hooks/use-theme-config";
import {
  LayoutDashboard,
  Users,
  Tv,
  Settings,
  FileText,
  Database,
  BarChart,
  LogOut,
  Zap,
  Sun,
  Moon,
  Menu,
  X,
  MoreVertical,
  type LucideIcon,
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

interface NavRoute {
  label: string;
  icon: LucideIcon;
  href: string;
  matchExact?: boolean;
}

// Main navigation routes
const MAIN_ROUTES: NavRoute[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    matchExact: true,
  },
  {
    label: "Groups",
    icon: Users,
    href: "/dashboard/groups",
  },
  {
    label: "Channels",
    icon: Tv,
    href: "/dashboard/channels",
  },
  {
    label: "Analytics",
    icon: BarChart,
    href: "/dashboard/analytics",
  },
];

// System routes
const SYSTEM_ROUTES: NavRoute[] = [
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
  },
  {
    label: "Config",
    icon: Settings,
    href: "/dashboard/config",
  },
  {
    label: "Logs",
    icon: FileText,
    href: "/dashboard/logs",
  },
  {
    label: "Database",
    icon: Database,
    href: "/dashboard/database",
  },
];

// Magnetic Nav Item with enhanced hover effects
function MagneticNavItem({
  route,
  isActive,
  onClick,
  index,
}: {
  route: NavRoute;
  isActive: boolean;
  onClick: () => void;
  index: number;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const Icon = route.icon;
  const { reducedMotion } = useThemeConfig();

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    requestAnimationFrame(() => {
      const distanceX = (e.clientX - centerX) * 0.15;
      const distanceY = (e.clientY - centerY) * 0.15;
      setPosition({ x: distanceX, y: distanceY });
    });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      animate={!reducedMotion ? { x: position.x, y: position.y } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      initial={!reducedMotion ? { opacity: 0, x: -20 } : undefined}
      whileInView={!reducedMotion ? { opacity: 1, x: 0 } : undefined}
      viewport={{ once: true }}
      // @ts-expect-error - framer-motion transition delay
      transition={{ delay: 0.1 + index * 0.05 }}
    >
      <Link
        href={route.href}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "flex items-center px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
          isActive
            ? "bg-primary/10 text-primary border border-primary/20"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
        )}
      >
        {/* Active indicator line */}
        <AnimatePresence>
          {isActive && !reducedMotion && (
            <motion.div
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              exit={{ scaleY: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Glow effect on hover */}
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, hsl(var(--primary) / 0.15), transparent 70%)",
          }}
        />

        <motion.div
          whileHover={!reducedMotion ? { scale: 1.1, rotate: 5 } : undefined}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <Icon
            className={cn(
              "w-5 h-5 transition-all duration-300 flex-shrink-0",
              isActive ? "text-primary" : "group-hover:text-[var(--text-primary)]"
            )}
          />
        </motion.div>
        <span className="ml-3 font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis relative z-10">
          {route.label}
        </span>
      </Link>
    </motion.div>
  );
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);
  const { resolvedTheme, setTheme } = useTheme();
  const { reducedMotion } = useThemeConfig();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    logout();
    window.location.href = "/login";
  }, [logout]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const isActive = (route: NavRoute) => {
    if (route.matchExact) {
      return pathname === route.href || pathname === "/";
    }
    return pathname.startsWith(route.href);
  };

  const closeMobileMenu = () => setIsMobileOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <motion.div
        className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--nezuko-surface)]/90 backdrop-blur-xl border-b border-[var(--nezuko-border)] z-30 flex items-center justify-between px-4"
        initial={!reducedMotion ? { y: -100 } : undefined}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold shadow-lg"
            whileHover={!reducedMotion ? { scale: 1.1, rotate: 5 } : undefined}
            whileTap={!reducedMotion ? { scale: 0.95 } : undefined}
          >
            <Zap className="w-4 h-4" />
          </motion.div>
          <span
            className="font-extrabold text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            NEZUKO
          </span>
        </div>
        <motion.button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-xl glass text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          whileHover={!reducedMotion ? { scale: 1.1 } : undefined}
          whileTap={!reducedMotion ? { scale: 0.95 } : undefined}
        >
          <AnimatePresence mode="wait">
            {isMobileOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-5 h-5" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-20"
            onClick={closeMobileMenu}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          "fixed h-full bg-[var(--nezuko-surface)]/95 backdrop-blur-xl border-r border-[var(--nezuko-border)] flex flex-col justify-between z-20 transition-transform duration-300 ease-in-out",
          "w-64 left-0",
          "top-16 lg:top-0 h-[calc(100vh-64px)] lg:h-screen",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
        initial={false}
      >
        {/* Logo - Desktop only */}
        <motion.div
          className="hidden lg:flex h-16 items-center px-6 mb-2"
          initial={!reducedMotion ? { opacity: 0, y: -20 } : undefined}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold shadow-lg mr-3"
            whileHover={!reducedMotion ? { scale: 1.1, rotate: 5 } : undefined}
            whileTap={!reducedMotion ? { scale: 0.95 } : undefined}
          >
            <Zap className="w-5 h-5" />
          </motion.div>
          <span
            className="font-extrabold text-xl tracking-wide"
            style={{ color: "var(--text-primary)" }}
          >
            NEZUKO
          </span>
        </motion.div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-3 space-y-1">
            {MAIN_ROUTES.map((route, idx) => (
              <MagneticNavItem
                key={route.href}
                route={route}
                isActive={isActive(route)}
                onClick={closeMobileMenu}
                index={idx}
              />
            ))}

            {/* System Section */}
            <motion.div
              className="pt-6 pb-2"
              initial={!reducedMotion ? { opacity: 0 } : undefined}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <p className="px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                System
              </p>
            </motion.div>

            {SYSTEM_ROUTES.map((route, idx) => (
              <MagneticNavItem
                key={route.href}
                route={route}
                isActive={isActive(route)}
                onClick={closeMobileMenu}
                index={MAIN_ROUTES.length + idx}
              />
            ))}
          </nav>
        </div>

        {/* Bottom Section */}
        <motion.div
          className="p-4 space-y-3 border-t border-[var(--nezuko-border)]/50"
          initial={!reducedMotion ? { opacity: 0, y: 20 } : undefined}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {/* Theme Toggle */}
          <motion.button
            onClick={toggleTheme}
            className="w-full flex items-center px-3 py-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all duration-300 group"
            whileHover={!reducedMotion ? { scale: 1.02 } : undefined}
            whileTap={!reducedMotion ? { scale: 0.98 } : undefined}
          >
            <motion.div
              className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors flex-shrink-0"
              whileHover={!reducedMotion ? { rotate: 180 } : undefined}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence mode="wait">
                {resolvedTheme === "dark" ? (
                  <motion.div
                    key="moon"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="w-4 h-4 group-hover:text-primary transition-colors" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="w-4 h-4 group-hover:text-primary transition-colors" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            <span className="ml-3 text-sm font-medium whitespace-nowrap">
              {resolvedTheme === "dark" ? "Dark Mode" : "Light Mode"}
            </span>
          </motion.button>

          {/* User Profile */}
          <motion.div
            className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center hover:border-primary/20 transition-all duration-300"
            whileHover={!reducedMotion ? { scale: 1.02 } : undefined}
          >
            <div className="relative flex-shrink-0">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || "default"}`}
                alt={user?.full_name || "User"}
                className="w-10 h-10 rounded-full border border-primary/30 p-0.5 transition-transform duration-300 hover:scale-110"
              />
              <span
                className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[var(--nezuko-surface)] rounded-full animate-pulse"
                style={{ boxShadow: "0 0 6px rgba(34, 197, 94, 0.5)" }}
              />
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p
                className="text-sm font-bold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {user?.full_name || user?.email?.split("@")[0] || "User"}
              </p>
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/20 text-primary border border-primary/20">
                {user?.role || "Admin"}
              </span>
            </div>
            <motion.button
              onClick={handleLogout}
              className="ml-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-lg hover:bg-white/5"
              whileHover={!reducedMotion ? { scale: 1.1, rotate: 90 } : undefined}
              whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
              title="Logout"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.aside>

      {/* Mobile Spacer */}
      <div className="lg:hidden h-16" />
    </>
  );
}
