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
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.82),transparent_20%),radial-gradient(circle_at_top_right,rgba(109,93,252,0.10),transparent_28%),linear-gradient(180deg,#fdfefe_0%,#eff4fb_100%)] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_12%,rgba(255,255,255,0.8),transparent_16%),radial-gradient(circle_at_80%_18%,rgba(197,217,255,0.45),transparent_18%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[1100px] items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="hidden lg:block">
            <div className="max-w-[520px] space-y-6">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/68 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-slate-900" />
                Colabo Workspace
              </div>
              <h1 className="font-space-grotesk text-[52px] font-semibold leading-[1.02] tracking-tight text-slate-950">
                Project clarity for teams that need to move together.
              </h1>
              <p className="max-w-[430px] text-[17px] leading-7 text-slate-500">
                Plan work, track ownership, and keep every project moving from one focused workspace.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="rounded-[1.5rem] border border-white/70 bg-white/62 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-400">Work</p>
                  <p className="mt-3 text-[20px] font-semibold text-slate-950">Clear priorities</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Projects, tasks, and owners stay easy to scan from day to day.</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(245,249,255,0.74))] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-400">Team</p>
                  <p className="mt-3 text-[20px] font-semibold text-slate-950">Aligned execution</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Updates, invites, and handoffs stay connected across the workspace.</p>
                </div>
              </div>
            </div>
          </section>

          <Card className={cn("mx-auto w-full max-w-[560px]", className)}>
            <CardHeader className="pb-6">
              <div className="mb-6 flex items-center justify-center lg:justify-start">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.7rem] bg-slate-950 shadow-[0_16px_40px_rgba(15,23,42,0.22)]">
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
            <CardContent>{children}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
