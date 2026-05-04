"use client";

import { Formik, Form, ErrorMessage } from "formik";
import * as Yup from "yup";
import type { Column } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { SettingsField } from "@/components/ui/settings-field";
import { ColumnColorPicker, ColumnTypeListbox } from "@/components/board/column-form-controls";

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
    columns?: Column[];
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

export function CreateColumnModal({ isOpen, onClose, onSubmit, columns = [] }: CreateColumnModalProps) {
    if (!isOpen) return null;

    const hasDoneColumn = columns.some((column) => column.type === "done");
    const disabledColumnTypes: Partial<Record<ColumnType, string>> = hasDoneColumn
        ? { done: "Only one Done column is allowed per board." }
        : {};

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
                            <ColumnColorPicker value={values.color} onChange={(value) => setFieldValue("color", value)} />
                            <ErrorMessage name="color" component="p" className="mt-2 text-sm font-medium text-red-500" />
                        </SettingsField>

                        <SettingsField label="Column Type" className="relative z-20">
                            <ColumnTypeListbox
                                value={values.type}
                                onChange={(value) => setFieldValue("type", value)}
                                disabledOptions={disabledColumnTypes}
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
