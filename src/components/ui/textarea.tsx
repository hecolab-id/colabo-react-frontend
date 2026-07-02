import * as React from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends React.ComponentProps<"textarea"> {
  invalid?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid = false, "aria-invalid": ariaInvalid, ...props }, ref) => {
    const isInvalid = invalid || ariaInvalid === true || ariaInvalid === "true";

    return (
      <textarea
        ref={ref}
        aria-invalid={isInvalid || undefined}
        className={cn(
          "flex min-h-28 w-full resize-y rounded-[var(--radius-lg)] border border-[var(--control-border)] bg-[var(--control-bg)] px-4 py-3 text-[15px] text-foreground shadow-[var(--control-shadow)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] placeholder:text-[var(--control-placeholder)] hover:border-[var(--control-border-hover)] hover:bg-[var(--control-bg-hover)] focus-visible:border-[var(--control-border-hover)] focus-visible:bg-[var(--control-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:bg-[var(--control-bg-disabled)] disabled:opacity-60",
          isInvalid && "border-[var(--danger-border)] text-[var(--danger-fg)] focus-visible:border-[var(--danger-border)] focus-visible:ring-[var(--control-error-ring)]",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
export type { TextareaProps };
