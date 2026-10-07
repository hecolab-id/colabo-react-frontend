import type { ReactNode } from "react";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AuthField({
  label,
  error,
  icon,
  inputClassName,
  simple = false,
  labelAction,
  ...props
}: React.ComponentProps<typeof Input> & {
  label: string;
  error?: string | null;
  icon?: ReactNode;
  inputClassName?: string;
  simple?: boolean;
  labelAction?: ReactNode;
}) {
  const fieldId = props.id?.toString() || (typeof props.name === "string" ? `auth-${props.name}` : undefined);

  if (simple) {
    const errorId = error && fieldId ? `${fieldId}-error` : undefined;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={fieldId} className="text-sm font-medium text-foreground">{label}</label>
          {labelAction}
        </div>
        <Input
          {...props}
          id={fieldId}
          invalid={Boolean(error)}
          aria-describedby={[props["aria-describedby"], errorId].filter(Boolean).join(" ") || undefined}
          className={inputClassName}
        />
        {error ? <p id={errorId} role="alert" className="text-sm leading-5 text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <FormField label={label} htmlFor={fieldId} error={error}>
      <div className="relative">
        {icon ? (
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        ) : null}
        <Input
          invalid={Boolean(error)}
          className={cn(icon ? "pl-11" : "", inputClassName)}
          id={fieldId}
          {...props}
        />
      </div>
    </FormField>
  );
}
