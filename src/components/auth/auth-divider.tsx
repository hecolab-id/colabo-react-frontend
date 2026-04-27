import { Separator } from "@/components/ui/separator";

export function AuthDivider() {
  return (
    <div className="flex items-center gap-4">
      <Separator className="flex-1" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Or continue with
      </span>
      <Separator className="flex-1" />
    </div>
  );
}
