import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-[1.15rem] border border-black/6 bg-white/75 px-4 py-3 text-[15px] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
