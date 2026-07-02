"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useEscapeKey } from "@/lib/hooks/use-escape-key";
import { cn } from "@/lib/utils";

interface DialogShellProps {
  children: ReactNode;
  onClose: () => void;
  className?: string;
  panelClassName?: string;
  maxWidthClassName?: string;
  zIndexClassName?: string;
  mobileSheet?: boolean;
  closeOnOverlayClick?: boolean;
  labelledBy?: string;
  describedBy?: string;
  escapeEnabled?: boolean;
}

export function DialogShell({
  children,
  onClose,
  className,
  panelClassName,
  maxWidthClassName = "max-w-md",
  zIndexClassName = "z-[80]",
  mobileSheet = true,
  closeOnOverlayClick = true,
  labelledBy,
  describedBy,
  escapeEnabled = true,
}: DialogShellProps) {
  useEscapeKey(escapeEnabled, onClose);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const dialog = (
    <div
      className={cn(
        "fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4",
        zIndexClassName,
        className,
      )}
    >
      <div
        className="absolute inset-0 bg-[var(--modal-overlay)] backdrop-blur-md"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={cn(
          "relative w-full border border-[var(--modal-border)] bg-[var(--modal-surface)] text-foreground shadow-[var(--modal-shadow)] backdrop-blur-2xl",
          mobileSheet ? "rounded-t-[var(--modal-radius)] sm:rounded-[var(--modal-radius)]" : "rounded-[var(--modal-radius)]",
          maxWidthClassName,
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return dialog;
  }

  return createPortal(dialog, document.body);
}

export type { DialogShellProps };
