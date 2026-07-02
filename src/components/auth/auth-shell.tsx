import type { ReactNode } from "react";
import AppImage from "@/components/app-image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AuthShell({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-border" />
      <div className="relative mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[1100px] items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="hidden lg:block">
            <div className="max-w-[520px] space-y-6">
              <div className="inline-flex items-center gap-3 rounded-[var(--radius-pill)] border border-border bg-[var(--surface-card)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-muted-foreground shadow-[var(--surface-card-shadow-sm)] backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Colabo Workspace
              </div>
              <h1 className="text-[52px] font-semibold leading-[1.02] tracking-tight text-foreground">
                Project clarity for teams that need to move together.
              </h1>
              <p className="max-w-[430px] text-[17px] leading-7 text-muted-foreground">
                Plan work, track ownership, and keep every project moving from one focused workspace.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <Card variant="default" padding="sm">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Work</p>
                  <p className="mt-3 text-[20px] font-semibold text-foreground">Clear priorities</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Projects, tasks, and owners stay easy to scan from day to day.</p>
                </Card>
                <Card variant="default" padding="sm">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Team</p>
                  <p className="mt-3 text-[20px] font-semibold text-foreground">Aligned execution</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Updates, invites, and handoffs stay connected across the workspace.</p>
                </Card>
              </div>
            </div>
          </section>

          <Card variant="elevated" className={cn("mx-auto w-full max-w-[560px]", className)}>
            <CardHeader className="p-5 sm:p-8 sm:pb-6">
              <div className="mb-6 flex items-center justify-center lg:justify-start">
                <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] bg-primary shadow-[var(--shadow-button-primary)]">
                  <AppImage
                    src="/logo.webp"
                    alt="Colabo Logo"
                    width={34}
                    height={34}
                    className="h-8 w-8 object-contain invert brightness-0"
                  />
                </div>
              </div>
              <CardTitle className="text-center lg:text-left">{title}</CardTitle>
              <CardDescription className="text-center lg:text-left">{description}</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-6 sm:px-8 sm:pb-8">{children}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
