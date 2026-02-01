"use client";

import { type ReactNode } from "react";
import { FadeIn } from "@/components/ui/page-transition";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  highlight?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Unified page header with title, optional gradient highlight, description, and action buttons.
 * Responsive layout that stacks on mobile.
 */
export function PageHeader({
  title,
  highlight,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <FadeIn>
      <div
        className={cn(
          "flex flex-col md:flex-row justify-between items-start md:items-center gap-6",
          className
        )}
      >
        <div>
          <h1
            className="text-4xl md:text-5xl font-black tracking-tight mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            {title}{" "}
            {highlight && <span className="gradient-text">{highlight}</span>}
          </h1>
          {description && (
            <p className="text-[var(--text-muted)] max-w-2xl">{description}</p>
          )}
        </div>

        {children && (
          <div className="flex items-center gap-3 shrink-0">{children}</div>
        )}
      </div>
    </FadeIn>
  );
}
