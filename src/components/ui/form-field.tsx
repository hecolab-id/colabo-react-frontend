import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
}

export function FormField({
  label,
  children,
  className,
  htmlFor,
  description,
  error,
  required = false,
}: FormFieldProps) {
  const LabelTag = htmlFor ? "label" : "div";

  return (
    <div className={cn("space-y-2.5", className)}>
      <LabelTag
        {...(htmlFor ? { htmlFor } : {})}
        className="block text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
      >
        {label}
        {required ? <span className="ml-1 text-[var(--danger-fg)]">*</span> : null}
      </LabelTag>
      {children}
      {description && !error ? (
        <p className="text-[13px] leading-5 text-muted-foreground">{description}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-[13px] font-medium leading-5 text-[var(--danger-fg)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type { FormFieldProps };
