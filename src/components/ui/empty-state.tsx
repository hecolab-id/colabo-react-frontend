import { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const emptyStateVariants = cva(
    "flex flex-col items-center justify-center text-center border border-dashed border-slate-200 bg-slate-50/60",
    {
        variants: {
            size: {
                compact: "rounded-[1.25rem] px-4 py-8 gap-2",
                default: "rounded-[24px] px-6 py-14 gap-3",
                hero: "rounded-[32px] px-6 py-16 gap-4 md:py-24",
            },
        },
        defaultVariants: {
            size: "default",
        },
    },
);

const iconWrapperVariants = cva(
    "flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm",
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

const titleVariants = cva("font-semibold tracking-tight text-slate-900", {
    variants: {
        size: {
            compact: "text-sm",
            default: "text-lg",
            hero: "text-3xl",
        },
    },
    defaultVariants: { size: "default" },
});

const descriptionVariants = cva("text-slate-500 leading-relaxed", {
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
