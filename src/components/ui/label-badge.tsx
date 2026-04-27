"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/lib/types";

interface LabelBadgeProps {
    label: Label;
    onRemove?: () => void;
    size?: "sm" | "md";
    className?: string;
}

export function LabelBadge({ label, onRemove, size = "md", className }: LabelBadgeProps) {
    const sizeClasses = {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-3 py-1",
    };

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded font-medium transition-colors",
                sizeClasses[size],
                className
            )}
            style={{
                backgroundColor: `${label.color}20`,
                color: label.color,
                border: `1px solid ${label.color}40`,
            }}
        >
            <span className="min-w-0 truncate">{label.name}</span>
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="hover:opacity-70 transition-opacity"
                    aria-label={`Remove ${label.name} label`}
                >
                    <X className="w-3 h-3" />
                </button>
            )}
        </span>
    );
}
