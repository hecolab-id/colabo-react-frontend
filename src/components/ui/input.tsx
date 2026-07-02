import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends Omit<React.ComponentProps<"input">, "size"> {
  invalid?: boolean;
  controlSize?: "sm" | "md" | "lg";
}

const inputSizeClasses = {
  sm: "h-[var(--control-height-sm)] px-3 text-sm",
  md: "h-[var(--control-height-md)] px-4 text-[15px]",
  lg: "h-[var(--control-height-lg)] px-4 text-base",
} as const;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid = false, controlSize = "lg", "aria-invalid": ariaInvalid, ...props }, ref) => {
    const isInvalid = invalid || ariaInvalid === true || ariaInvalid === "true";

    return (
      <input
        ref={ref}
        aria-invalid={isInvalid || undefined}
        className={cn(
          "flex w-full rounded-[var(--radius-lg)] border border-[var(--control-border)] bg-[var(--control-bg)] py-3 text-foreground shadow-[var(--control-shadow)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] placeholder:text-[var(--control-placeholder)] hover:border-[var(--control-border-hover)] hover:bg-[var(--control-bg-hover)] focus-visible:border-[var(--control-border-hover)] focus-visible:bg-[var(--control-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:bg-[var(--control-bg-disabled)] disabled:opacity-60",
          inputSizeClasses[controlSize],
          isInvalid && "border-[var(--danger-border)] text-[var(--danger-fg)] focus-visible:border-[var(--danger-border)] focus-visible:ring-[var(--control-error-ring)]",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
