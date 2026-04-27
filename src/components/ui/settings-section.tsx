import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsSection({
    eyebrow,
    title,
    description,
    action,
    children,
    className,
    contentClassName,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
}) {
    return (
        <section
            className={cn(
                "rounded-[2rem] border border-white/70 bg-white/82 p-6 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.25)] backdrop-blur-2xl sm:p-8",
                className,
            )}
        >
            <div className="flex flex-col gap-4 border-b border-black/5 pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                    {eyebrow ? (
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            {eyebrow}
                        </p>
                    ) : null}
                    <div className="space-y-1.5">
                        <h2 className="text-[20px] font-semibold tracking-tight text-slate-950 sm:text-[22px]">
                            {title}
                        </h2>
                        {description ? (
                            <p className="max-w-2xl text-sm leading-6 text-slate-500 sm:text-[15px]">
                                {description}
                            </p>
                        ) : null}
                    </div>
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </div>

            <div className={cn("pt-6", contentClassName)}>{children}</div>
        </section>
    );
}
