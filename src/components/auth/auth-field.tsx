import type { ReactNode } from "react";
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
  return (
    <label className="block space-y-2">
      <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      <div className="relative">
        {icon ? (
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        ) : null}
        <Input
          className={cn(icon ? "pl-11" : "", error ? "border-red-300 focus-visible:ring-red-200" : "", inputClassName)}
          {...props}
        />
      </div>
      {error ? <p className="text-[13px] font-medium text-red-500">{error}</p> : null}
    </label>
  );
}
