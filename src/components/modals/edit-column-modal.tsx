"use client";

import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { X, Trash2 } from "lucide-react";
import { Column } from "@/lib/types";
import { useState } from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

type ColumnType = NonNullable<Column["type"]>;

interface EditColumnFormValues {
    name: string;
    color: string;
    type: ColumnType;
}

interface EditColumnModalProps {
    isOpen: boolean;
    column: Column;
    onClose: () => void;
    onSubmit: (columnId: string, name: string, color: string, type?: ColumnType) => Promise<void>;
    onDelete: (columnId: string) => Promise<void>;
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

export function EditColumnModal({ isOpen, column, onClose, onSubmit, onDelete }: EditColumnModalProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen) return null;

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete(column.id);
            onClose();
        } catch (error) {
            console.error("Failed to delete column:", error);
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(false);
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            >
                <div
                    className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-border">
                        <h2 className="text-lg font-semibold text-foreground">Edit Column</h2>
                        <button
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <Formik
                        initialValues={{ name: column.name, color: column.color, type: column.type || "default" } satisfies EditColumnFormValues}
                        validationSchema={columnSchema}
                        onSubmit={async (values, { setSubmitting }) => {
                            try {
                                await onSubmit(column.id, values.name, values.color, values.type);
                                onClose();
                            } catch (error) {
                                console.error("Failed to update column:", error);
                            } finally {
                                setSubmitting(false);
                            }
                        }}
                    >
                        {({ isSubmitting, values, setFieldValue }) => (
                            <Form className="p-6 space-y-5">
                                {/* Column Name */}
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                                        Column Name
                                    </label>
                                    <Field
                                        type="text"
                                        id="name"
                                        name="name"
                                        placeholder="e.g. In Review, Testing, Blocked..."
                                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                    <ErrorMessage
                                        name="name"
                                        component="p"
                                        className="mt-1 text-sm text-red-500"
                                    />
                                </div>

                                {/* Color Picker */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Column Color
                                    </label>
                                    <div className="grid grid-cols-4 gap-2 mb-3">
                                        {colorPresets.map((preset) => (
                                            <button
                                                key={preset.color}
                                                type="button"
                                                onClick={() => setFieldValue("color", preset.color)}
                                                className={`w-full h-10 rounded-lg border-2 transition-all ${values.color === preset.color
                                                    ? "border-foreground scale-105"
                                                    : "border-transparent hover:border-muted-foreground/50"
                                                    }`}
                                                style={{ backgroundColor: preset.color }}
                                                title={preset.name}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-lg border border-border"
                                            style={{ backgroundColor: values.color }}
                                        />
                                        <Field
                                            type="text"
                                            name="color"
                                            placeholder="#6366f1"
                                            className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    <ErrorMessage
                                        name="color"
                                        component="p"
                                        className="mt-1 text-sm text-red-500"
                                    />
                                </div>

                                {/* Column Type */}
                                <div>
                                    <label htmlFor="type" className="block text-sm font-medium text-foreground mb-2">
                                        Column Type
                                    </label>
                                    <Field
                                        as="select"
                                        id="type"
                                        name="type"
                                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    >
                                        <option value="default">Default (To Do, Backlog, etc.)</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="done">Done (Completed)</option>
                                    </Field>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Tasks in "Done" columns will show 100% progress when they have no checklists
                                    </p>
                                    <ErrorMessage
                                        name="type"
                                        component="p"
                                        className="mt-1 text-sm text-red-500"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex justify-between items-center pt-2">
                                    {/* Delete Button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteDialog(true)}
                                        disabled={column.is_default}
                                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={column.is_default ? "Cannot delete default columns" : "Delete column"}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                                        >
                                            {isSubmitting ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={showDeleteDialog}
                onCancel={() => setShowDeleteDialog(false)}
                onConfirm={handleDelete}
                title="Delete Column"
                description={`Are you sure you want to delete "${column.name}"? All tasks in this column will be moved to the first available column.`}
                confirmText={isDeleting ? "Deleting..." : "Delete"}
            />
        </>
    );
}
