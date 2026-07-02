import { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const emptyStateVariants = cva(
    "flex flex-col items-center justify-center border border-border bg-muted/40 text-center text-muted-foreground",
    {
        variants: {
            size: {
                compact: "gap-2 rounded-[var(--radius-lg)] px-4 py-8",
                default: "gap-3 rounded-[var(--radius-xl)] px-6 py-14",
                hero: "gap-4 rounded-[var(--radius-2xl)] px-6 py-16 md:py-24",
            },
        },
        defaultVariants: {
            size: "default",
        },
    },
);

const iconWrapperVariants = cva(
    "flex shrink-0 items-center justify-center rounded-full border border-border bg-[var(--surface-card-solid)] text-muted-foreground shadow-sm",
    {
        variants: {
            size: {
                compact: "h-10 w-10 mb-2",
                default: "h-14 w-14 mb-2",
                hero: "h-20 w-20 mb-3 border border-black/5",
            },
        },
        defaultVariants: { size: "default" },
    },
);

const titleVariants = cva("font-semibold tracking-tight text-foreground", {
    variants: {
        size: {
            compact: "text-sm",
            default: "text-lg",
            hero: "text-3xl",
        },
    },
    defaultVariants: { size: "default" },
});

const descriptionVariants = cva("leading-relaxed text-muted-foreground", {
    variants: {
        size: {
            compact: "text-xs max-w-xs",
            default: "text-sm max-w-sm",
            hero: "text-[16px] max-w-lg",
        },
    },
    defaultVariants: { size: "default" },
});

interface EmptyStateProps extends VariantProps<typeof emptyStateVariants> {
    icon?: ReactNode;
    title: string;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
}

export function EmptyState({ size = "default", icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={cn(emptyStateVariants({ size }), className)}>
            {icon ? <div className={iconWrapperVariants({ size })}>{icon}</div> : null}
            <h3 className={titleVariants({ size })}>{title}</h3>
            {description ? <p className={descriptionVariants({ size })}>{description}</p> : null}
            {action ? <div className={size === "hero" ? "mt-4" : "mt-3"}>{action}</div> : null}
        </div>
    );
}
