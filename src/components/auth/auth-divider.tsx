import { Separator } from "@/components/ui/separator";

export function AuthDivider() {
  return (
    <div className="flex items-center gap-4" aria-hidden="true">
      <Separator className="flex-1" />
      <span className="text-sm text-muted-foreground">
        or
      </span>
      <Separator className="flex-1" />
    </div>
  );
}
