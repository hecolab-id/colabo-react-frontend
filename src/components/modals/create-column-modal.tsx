"use client";

import { Formik, Form, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Check, ChevronDown } from "lucide-react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { Column } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { SettingsField } from "@/components/ui/settings-field";

type ColumnType = NonNullable<Column["type"]>;

interface CreateColumnFormValues {
    name: string;
    color: string;
    type: ColumnType;
}

interface CreateColumnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, color: string, type?: ColumnType) => Promise<void>;
}

const columnSchema = Yup.object().shape({
    name: Yup.string()
        .required("Column name is required")
        .min(1, "Column name is required")
        .max(50, "Column name must be less than 50 characters"),
    color: Yup.string()
        .required("Color is required")
        .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
    type: Yup.string()
        .oneOf(["default", "in_progress", "done"], "Invalid column type")
        .required("Column type is required"),
});

const colorPresets = [
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

function ColumnTypeListbox({
    value,
    onChange,
}: {
    value: ColumnType;
    onChange: (value: ColumnType) => void;
}) {
    const selectedOption = columnTypeOptions.find((option) => option.value === value) ?? columnTypeOptions[0];

    return (
        <Listbox value={value} onChange={onChange}>
            <div className="relative">
                <ListboxButton className="relative w-full rounded-2xl border-0 bg-slate-50 px-4 py-3.5 text-left text-[15px] font-medium text-slate-900 transition-colors focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/10">
                    <span className="block truncate">{selectedOption.label}</span>
                    <span className="mt-0.5 block truncate text-xs font-medium text-slate-400">{selectedOption.description}</span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                        <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </span>
                </ListboxButton>

                <ListboxOptions
                    transition
                    className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-[1.4rem] border border-white/80 bg-white/92 p-1.5 text-[15px] shadow-[0_24px_60px_-24px_rgba(15,23,42,0.28)] backdrop-blur-2xl transition duration-200 ease-out focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0"
                >
                    {columnTypeOptions.map((option) => (
                        <ListboxOption
                            key={option.value}
                            value={option.value}
                            className={({ focus }) =>
                                cn(
                                    "relative cursor-pointer select-none rounded-[1rem] py-3 pl-10 pr-4 transition-colors",
                                    focus ? "bg-slate-100/90 text-slate-900" : "text-slate-700"
                                )
                            }
                        >
                            {({ selected }) => (
                                <>
                                    <span className={cn("block truncate", selected ? "font-semibold text-slate-900" : "font-medium")}>
                                        {option.label}
                                    </span>
                                    <span className="mt-0.5 block text-xs font-medium text-slate-400">
                                        {option.description}
                                    </span>
                                    {selected ? (
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-900">
                                            <Check className="h-4 w-4" aria-hidden="true" />
                                        </span>
                                    ) : null}
                                </>
                            )}
                        </ListboxOption>
                    ))}
                </ListboxOptions>
            </div>
        </Listbox>
    );
}

export function CreateColumnModal({ isOpen, onClose, onSubmit }: CreateColumnModalProps) {
    if (!isOpen) return null;

    return (
        <ModalShell
            title="New Column"
            description="Add a focused stage to this project board."
            onClose={onClose}
            maxWidthClassName="max-w-md"
            contentClassName="max-h-[90dvh] overflow-y-auto scrollbar-hide"
        >
            <Formik
                initialValues={{ name: "", color: "#6366f1", type: "default" } satisfies CreateColumnFormValues}
                validationSchema={columnSchema}
                onSubmit={async (values, { setSubmitting }) => {
                    try {
                        await onSubmit(values.name.trim(), values.color, values.type);
                        onClose();
                    } catch (error) {
                        console.error("Failed to create column:", error);
                    } finally {
                        setSubmitting(false);
                    }
                }}
            >
                {({ isSubmitting, values, handleChange, setFieldValue }) => (
                    <Form className="space-y-6">
                        <SettingsField label="Column Name">
                            <Input
                                type="text"
                                id="name"
                                name="name"
                                value={values.name}
                                onChange={handleChange}
                                placeholder="e.g. Review, Testing, Blocked..."
                                autoFocus
                            />
                            <ErrorMessage name="name" component="p" className="mt-2 text-sm font-medium text-red-500" />
                        </SettingsField>

                        <SettingsField label="Column Color">
                            <div className="grid grid-cols-8 gap-2">
                                {colorPresets.map((preset) => (
                                    <button
                                        key={preset.color}
                                        type="button"
                                        onClick={() => setFieldValue("color", preset.color)}
                                        className={cn(
                                            "h-9 rounded-full border transition-[transform,box-shadow,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10",
                                            values.color === preset.color
                                                ? "scale-105 border-white shadow-[0_0_0_2px_rgba(15,23,42,0.72),0_10px_20px_rgba(15,23,42,0.12)]"
                                                : "border-white/80 shadow-sm hover:scale-105"
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
                                    style={{ backgroundColor: values.color }}
                                    aria-hidden="true"
                                />
                                <Input
                                    type="text"
                                    name="color"
                                    value={values.color}
                                    onChange={handleChange}
                                    placeholder="#6366f1"
                                    className="h-10 rounded-xl bg-white font-mono text-sm"
                                />
                            </div>
                            <ErrorMessage name="color" component="p" className="mt-2 text-sm font-medium text-red-500" />
                        </SettingsField>

                        <SettingsField label="Column Type" className="relative z-20">
                            <ColumnTypeListbox
                                value={values.type}
                                onChange={(value) => setFieldValue("type", value)}
                            />
                            <ErrorMessage name="type" component="p" className="mt-2 text-sm font-medium text-red-500" />
                        </SettingsField>

                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                            <Button type="button" onClick={onClose} variant="ghost" size="lg" className="w-full sm:w-auto">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting} size="lg" className="w-full flex-1">
                                {isSubmitting ? "Creating..." : "Create Column"}
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </ModalShell>
    );
}
