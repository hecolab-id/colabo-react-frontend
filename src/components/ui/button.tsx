import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-pill)] text-sm font-semibold transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.985]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-button-primary)] hover:opacity-95",
        secondary:
          "border border-border bg-[var(--surface-raised)] text-foreground shadow-[var(--shadow-button-secondary)] backdrop-blur-xl hover:bg-[var(--surface-hover)]",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-[var(--surface-hover)]",
        danger:
          "bg-destructive text-[var(--destructive-foreground)] shadow-[var(--shadow-button-danger)] hover:opacity-95",
      },
      size: {
        sm: "h-[var(--control-height-sm)] px-4",
        md: "h-[var(--control-height-md)] px-5",
        lg: "h-[var(--control-height-lg)] px-6",
        icon: "h-[var(--control-height-icon)] w-[var(--control-height-icon)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
