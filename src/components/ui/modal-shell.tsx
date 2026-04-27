import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useEscapeKey } from "@/lib/hooks/use-escape-key";
import { cn } from "@/lib/utils";

export function ModalShell({
  title,
  description,
  children,
  onClose,
  maxWidthClassName = "max-w-md",
  contentClassName,
  bodyClassName,
  mobileSheet = true,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  maxWidthClassName?: string;
  contentClassName?: string;
  bodyClassName?: string;
  mobileSheet?: boolean;
}) {
  useEscapeKey(true, onClose);

  const modal = (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-950/28 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          "relative w-full border border-white/80 bg-white/88 shadow-[0_30px_100px_rgba(15,23,42,0.18)] backdrop-blur-2xl",
          mobileSheet ? "rounded-t-[2rem] sm:rounded-[2rem]" : "rounded-[2rem]",
          maxWidthClassName,
          contentClassName,
        )}
      >
        <div className={cn("p-6 sm:p-8", bodyClassName)}>
          <div className="mb-8 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-space-grotesk text-[24px] font-semibold tracking-tight text-slate-950 sm:text-[28px]">
                {title}
              </h2>
              {description ? <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white text-slate-400 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return modal;
  }

  return createPortal(modal, document.body);
}
