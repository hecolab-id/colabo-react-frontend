import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { DialogShell } from "@/components/ui/dialog-shell";
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
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = description ? `${titleId}-description` : undefined;

  return (
    <DialogShell
      onClose={onClose}
      maxWidthClassName={maxWidthClassName}
      mobileSheet={mobileSheet}
      panelClassName={contentClassName}
      labelledBy={titleId}
      describedBy={descriptionId}
    >
      <div className={cn("p-6 sm:p-8", bodyClassName)}>
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[24px] font-semibold tracking-tight text-foreground sm:text-[28px]">
              {title}
            </h2>
            {description ? <p id={descriptionId} className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-[var(--surface-raised)] text-muted-foreground shadow-sm transition-colors hover:bg-[var(--surface-hover)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </DialogShell>
  );
}
