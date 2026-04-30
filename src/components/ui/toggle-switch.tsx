import { cn } from "@/lib/utils";

export function ToggleSwitch({
    checked,
    onClick,
    disabled = false,
    className,
    interactive = true,
}: {
    checked: boolean;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    interactive?: boolean;
}) {
    const switchClassName = cn(
        "relative inline-flex h-7 w-12 shrink-0 rounded-full border border-slate-200 bg-slate-200 transition-[background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50",
        checked && "border-primary bg-primary shadow-[0_10px_24px_-18px_rgba(109,93,252,0.9)]",
        !interactive && disabled && "cursor-not-allowed opacity-50",
        className,
    );

    const knob = (
        <span
            className={cn(
                "absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-[0_6px_14px_-8px_rgba(15,23,42,0.7)] transition-transform duration-200",
                checked ? "translate-x-5" : "translate-x-0",
            )}
        />
    );

    if (!interactive) {
        return (
            <span aria-hidden="true" className={switchClassName}>
                {knob}
            </span>
        );
    }

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onClick}
            disabled={disabled}
            className={switchClassName}
        >
            {knob}
        </button>
    );
}
