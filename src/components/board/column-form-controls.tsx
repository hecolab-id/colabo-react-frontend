"use client";

import { Check, ChevronDown, Lock } from "lucide-react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Column } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type ColumnType = NonNullable<Column["type"]>;

export const colorPresets = [
    { name: "Slate", color: "#94a3b8" },
    { name: "Blue", color: "#3b82f6" },
    { name: "Green", color: "#22c55e" },
    { name: "Orange", color: "#f97316" },
    { name: "Red", color: "#ef4444" },
    { name: "Purple", color: "#a855f7" },
    { name: "Pink", color: "#ec4899" },
    { name: "Indigo", color: "#6366f1" },
];

const columnTypeOptions: Array<{ value: ColumnType; label: string; description: string }> = [
    { value: "default", label: "Default", description: "Backlog, To Do, Review, or custom stages." },
    { value: "in_progress", label: "In Progress", description: "Work that is actively being handled." },
    { value: "done", label: "Done", description: "Completed tasks with automatic full progress." },
];

export function ColumnTypeListbox({
    value,
    onChange,
    disabledOptions = {},
}: {
    value: ColumnType;
    onChange: (value: ColumnType) => void;
    disabledOptions?: Partial<Record<ColumnType, string>>;
}) {
    const selectedOption = columnTypeOptions.find((option) => option.value === value) ?? columnTypeOptions[0];
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [optionsStyle, setOptionsStyle] = useState<CSSProperties | null>(null);

    const updateOptionsPosition = useCallback(() => {
        const button = buttonRef.current;
        if (!button) return;

        const rect = button.getBoundingClientRect();
        const gap = 8;
        const viewportPadding = 16;
        const maxHeight = Math.min(288, window.innerHeight - viewportPadding * 2);
        const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
        const spaceAbove = rect.top - viewportPadding;
        const shouldOpenUp = spaceBelow < 220 && spaceAbove > spaceBelow;

        setOptionsStyle({
            position: "fixed",
            top: shouldOpenUp ? undefined : rect.bottom + gap,
            bottom: shouldOpenUp ? window.innerHeight - rect.top + gap : undefined,
            left: rect.left,
            width: rect.width,
            maxHeight,
            zIndex: 80,
        });
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        updateOptionsPosition();
        window.addEventListener("resize", updateOptionsPosition);
        window.addEventListener("scroll", updateOptionsPosition, true);

        return () => {
            window.removeEventListener("resize", updateOptionsPosition);
            window.removeEventListener("scroll", updateOptionsPosition, true);
        };
    }, [isOpen, updateOptionsPosition]);

    return (
        <Listbox value={value} onChange={onChange}>
            {({ open }) => {
                if (open !== isOpen) {
                    queueMicrotask(() => setIsOpen(open));
                }

                const options = (
                    <ListboxOptions
                        transition
                        style={optionsStyle ?? undefined}
                        className="overflow-auto rounded-[1.4rem] border border-white/80 bg-white/96 p-1.5 text-[15px] shadow-[0_24px_60px_-24px_rgba(15,23,42,0.28)] backdrop-blur-2xl transition duration-200 ease-out focus:outline-none data-[closed]:-translate-y-1 data-[closed]:scale-[0.98] data-[closed]:opacity-0"
                    >
                        {columnTypeOptions.map((option) => (
                            <ListboxOption
                                key={option.value}
                                value={option.value}
                                disabled={Boolean(disabledOptions[option.value])}
                                className={({ focus }) =>
                                    cn(
                                        "relative cursor-pointer select-none rounded-[1rem] py-3 pl-10 pr-4 transition-colors",
                                        disabledOptions[option.value]
                                            ? "cursor-not-allowed border border-dashed border-slate-200/90 bg-transparent text-slate-500"
                                            : focus ? "bg-slate-100/90 text-slate-900" : "text-slate-700",
                                    )
                                }
                            >
                                {({ selected }) => (
                                    <>
                                        <span className={cn("block truncate", selected ? "font-semibold text-slate-900" : "font-medium")}>
                                            {option.label}
                                        </span>
                                        <span className={cn("mt-0.5 block text-xs font-medium", disabledOptions[option.value] ? "text-slate-500" : "text-slate-400")}>
                                            {disabledOptions[option.value] || option.description}
                                        </span>
                                        {selected ? (
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-900">
                                                <Check className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                        ) : disabledOptions[option.value] ? (
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                                            </span>
                                        ) : null}
                                    </>
                                )}
                            </ListboxOption>
                        ))}
                    </ListboxOptions>
                );

                return (
                    <div className="relative">
                        <ListboxButton
                            ref={buttonRef}
                            className="relative w-full rounded-[1.15rem] border border-black/6 bg-white/75 px-4 py-3.5 text-left text-[15px] font-medium text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <span className="block truncate">{selectedOption.label}</span>
                            <span className="mt-0.5 block truncate text-xs font-medium text-slate-400">{selectedOption.description}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                                <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                            </span>
                        </ListboxButton>

                        {typeof document !== "undefined" ? createPortal(options, document.body) : options}
                    </div>
                );
            }}
        </Listbox>
    );
}

export function ColumnColorPicker({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <>
            <div className="grid grid-cols-8 gap-2">
                {colorPresets.map((preset) => (
                    <button
                        key={preset.color}
                        type="button"
                        onClick={() => onChange(preset.color)}
                        className={cn(
                            "h-9 rounded-full border transition-[transform,box-shadow,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10",
                            value === preset.color
                                ? "scale-105 border-white shadow-[0_0_0_2px_rgba(15,23,42,0.72),0_10px_20px_rgba(15,23,42,0.12)]"
                                : "border-white/80 shadow-sm hover:scale-105",
                        )}
                        style={{ backgroundColor: preset.color }}
                        aria-label={`Use ${preset.name} column color`}
                        title={preset.name}
                    />
                ))}
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-[1.15rem] bg-slate-50 p-2">
                <div
                    className="h-9 w-9 shrink-0 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: value }}
                    aria-hidden="true"
                />
                <Input
                    type="text"
                    name="color"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="#6366f1"
                    className="h-10 rounded-xl bg-white font-mono text-sm"
                />
            </div>
        </>
    );
}
