import * as React from "react"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value?: number; indicatorClassName?: string }
>(({ className, indicatorClassName, value, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative h-2 w-full overflow-hidden rounded-full bg-muted",
            className
        )}
        {...props}
    >
        <div
            className={cn("h-full flex-1 rounded-full bg-primary transition-all duration-300", indicatorClassName)}
            style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }}
        />
    </div>
))
Progress.displayName = "Progress"

export { Progress }
