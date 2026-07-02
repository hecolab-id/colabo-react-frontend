import type { ReactNode } from "react";
import { FormField } from "@/components/ui/form-field";

export function SettingsField({
  label,
  children,
  className,
  htmlFor,
  description,
  error,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  description?: ReactNode;
  error?: ReactNode;
}) {
  return (
    <FormField label={label} className={className} htmlFor={htmlFor} description={description} error={error}>
      {children}
    </FormField>
  );
}
