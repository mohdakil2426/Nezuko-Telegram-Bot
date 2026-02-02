"use client";

import * as React from "react";
import { m, AnimatePresence } from "motion/react";
import { AlertTriangle, Trash2, Ban, XCircle, type LucideIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// Confirmation dialog variants for different destructive actions
type ConfirmVariant = "danger" | "warning" | "ban" | "delete";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

const variantConfig: Record<ConfirmVariant, { icon: LucideIcon; color: string; bgClass: string }> =
  {
    danger: {
      icon: AlertTriangle,
      color: "#ef4444",
      bgClass: "bg-red-500/10 border-red-500/20",
    },
    warning: {
      icon: AlertTriangle,
      color: "#f59e0b",
      bgClass: "bg-amber-500/10 border-amber-500/20",
    },
    ban: {
      icon: Ban,
      color: "#ef4444",
      bgClass: "bg-red-500/10 border-red-500/20",
    },
    delete: {
      icon: Trash2,
      color: "#ef4444",
      bgClass: "bg-red-500/10 border-red-500/20",
    },
  };

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass border-[var(--nezuko-border)] bg-[var(--nezuko-surface)]/95 backdrop-blur-xl">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            {/* Animated Icon */}
            <m.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border",
                config.bgClass
              )}
            >
              <Icon className="h-6 w-6" style={{ color: config.color }} />
            </m.div>

            <div className="flex-1">
              <AlertDialogTitle className="text-lg font-bold text-[var(--text-primary)]">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-sm text-[var(--text-muted)]">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 gap-3">
          <AlertDialogCancel
            disabled={isLoading}
            className="bg-transparent border-[var(--nezuko-border)] text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              "border-transparent font-semibold transition-all",
              variant === "warning"
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"
            )}
          >
            {isLoading ? (
              <m.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// useConfirm Hook - For imperative confirmation dialogs
// ============================================================================

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{
    open: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: null,
    resolve: null,
  });

  const confirm = React.useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolve });
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    state.resolve?.(true);
    setState({ open: false, options: null, resolve: null });
  }, [state.resolve]);

  const handleCancel = React.useCallback(() => {
    state.resolve?.(false);
    setState({ open: false, options: null, resolve: null });
  }, [state.resolve]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.options && (
        <ConfirmDialog
          open={state.open}
          onOpenChange={(open) => {
            if (!open) handleCancel();
          }}
          title={state.options.title}
          description={state.options.description}
          confirmText={state.options.confirmText}
          cancelText={state.options.cancelText}
          variant={state.options.variant}
          onConfirm={handleConfirm}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = React.useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
}

export type { ConfirmVariant, ConfirmOptions };
