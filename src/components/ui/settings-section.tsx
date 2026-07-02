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
                "rounded-[var(--radius-xl)] border border-[var(--surface-card-border)] bg-[var(--surface-card)] p-6 shadow-[var(--surface-card-shadow-sm)] backdrop-blur-xl sm:p-8",
                className,
            )}
        >
            <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                    {eyebrow ? (
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                            {eyebrow}
                        </p>
                    ) : null}
                    <div className="space-y-1.5">
                        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-[22px]">
                            {title}
                        </h2>
                        {description ? (
                            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
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
