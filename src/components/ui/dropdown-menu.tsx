"use client";

import { Fragment, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Menu, Transition } from "@headlessui/react";
import { Slot } from "@radix-ui/react-slot";
import Link from "@/components/app-link";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  children: ReactNode;
  className?: string;
}

export function DropdownMenu({ children, className }: DropdownMenuProps) {
  return (
    <Menu as="div" className={cn("relative inline-block text-left", className)}>
      {children}
    </Menu>
  );
}

interface DropdownMenuTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function DropdownMenuTrigger({ children, className, ...props }: DropdownMenuTriggerProps) {
  return (
    <Menu.Button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] text-sm font-semibold text-muted-foreground transition-[background-color,color,transform,border-color,box-shadow] hover:bg-[var(--surface-hover)] hover:text-foreground active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        className,
      )}
      {...props}
    >
      {children}
    </Menu.Button>
  );
}

interface DropdownMenuContentProps {
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
  widthClassName?: string;
}

export function DropdownMenuContent({
  children,
  align = "end",
  className,
  widthClassName = "w-56",
}: DropdownMenuContentProps) {
  return (
    <Transition
      as={Fragment}
      enter="transition ease-out duration-150"
      enterFrom="translate-y-1 scale-[0.98] opacity-0"
      enterTo="translate-y-0 scale-100 opacity-100"
      leave="transition ease-in duration-100"
      leaveFrom="translate-y-0 scale-100 opacity-100"
      leaveTo="translate-y-1 scale-[0.98] opacity-0"
    >
      <Menu.Items
        className={cn(
          "absolute z-50 mt-2 origin-top overflow-hidden rounded-[var(--radius-lg)] border border-[var(--surface-card-border)] bg-[var(--surface-card)] p-1.5 text-sm shadow-[var(--surface-card-shadow)] backdrop-blur-xl focus:outline-none",
          align === "end" ? "right-0" : "left-0",
          widthClassName,
          className,
        )}
      >
        {children}
      </Menu.Items>
    </Transition>
  );
}

interface DropdownMenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  danger?: boolean;
  icon?: ReactNode;
}

export function DropdownMenuItem({
  asChild = false,
  children,
  className,
  danger = false,
  disabled,
  icon,
  type = "button",
  ...props
}: DropdownMenuItemProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Menu.Item disabled={disabled}>
      {({ active, disabled: itemDisabled }) => (
        <Comp
          className={cn(
            "group flex min-h-10 w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm font-medium transition-colors focus:outline-none",
            danger
              ? active
                ? "bg-[var(--danger-bg)] text-[var(--danger-fg)]"
                : "text-[var(--danger-fg)]"
              : active
                ? "bg-[var(--surface-hover)] text-foreground"
                : "text-muted-foreground",
            itemDisabled && "cursor-not-allowed opacity-50",
            className,
          )}
          {...(!asChild ? { type } : {})}
          {...props}
        >
          {icon ? <span className="shrink-0 text-current">{icon}</span> : null}
          <span className="min-w-0 flex-1 truncate">{children}</span>
        </Comp>
      )}
    </Menu.Item>
  );
}

interface DropdownMenuLinkProps extends React.ComponentProps<typeof Link> {
  danger?: boolean;
  icon?: ReactNode;
}

export function DropdownMenuLink({
  children,
  className,
  danger = false,
  icon,
  ...props
}: DropdownMenuLinkProps) {
  return (
    <Menu.Item>
      {({ active }) => (
        <Link
          className={cn(
            "group flex min-h-10 w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm font-medium transition-colors focus:outline-none",
            danger
              ? active
                ? "bg-[var(--danger-bg)] text-[var(--danger-fg)]"
                : "text-[var(--danger-fg)]"
              : active
                ? "bg-[var(--surface-hover)] text-foreground"
                : "text-muted-foreground",
            className,
          )}
          {...props}
        >
          {icon ? <span className="shrink-0 text-current">{icon}</span> : null}
          <span className="min-w-0 flex-1 truncate">{children}</span>
        </Link>
      )}
    </Menu.Item>
  );
}

export function DropdownMenuHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("border-b border-border bg-muted/35 px-4 py-3", className)}>{children}</div>;
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("my-1 h-px bg-border", className)} role="none" />;
}
