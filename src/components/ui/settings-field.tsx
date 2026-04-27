import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <label className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</label>
      {children}
    </div>
  );
}
