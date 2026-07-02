import type { ReactNode } from "react";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AuthField({
  label,
  error,
  icon,
  inputClassName,
  ...props
}: React.ComponentProps<typeof Input> & {
  label: string;
  error?: string | null;
  icon?: ReactNode;
  inputClassName?: string;
}) {
  const fieldId = props.id?.toString() || (typeof props.name === "string" ? `auth-${props.name}` : undefined);

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
