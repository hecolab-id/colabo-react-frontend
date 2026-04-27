import { cn } from "@/lib/utils";

export function ToggleSwitch({
    checked,
    onClick,
    disabled = false,
    className,
}: {
    checked: boolean;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "relative inline-flex h-8 w-14 items-center rounded-full border border-black/5 bg-slate-200/90 p-1 transition-[background-color,box-shadow] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50",
                checked && "bg-slate-950 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.8)]",
                className,
            )}
        >
            <span
                className={cn(
                    "inline-block h-6 w-6 rounded-full bg-white shadow-[0_8px_18px_-10px_rgba(15,23,42,0.42)] transition-transform",
                    checked ? "translate-x-6" : "translate-x-0",
                )}
            />
        </button>
    );
}
