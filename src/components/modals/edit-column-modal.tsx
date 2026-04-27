"use client";

import { Formik, Form, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Trash2 } from "lucide-react";
import type { Column } from "@/lib/types";
import { useState } from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { SettingsField } from "@/components/ui/settings-field";
import { ColumnColorPicker, ColumnTypeListbox } from "@/components/board/column-form-controls";

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
            <ModalShell
                title="Edit Column"
                description="Adjust this stage without changing the rest of the board."
                onClose={onClose}
                maxWidthClassName="max-w-md"
                contentClassName="max-h-[90dvh] overflow-y-auto scrollbar-hide"
            >
                <Formik
                    initialValues={{ name: column.name, color: column.color, type: column.type || "default" } satisfies EditColumnFormValues}
                    validationSchema={columnSchema}
                    onSubmit={async (values, { setSubmitting }) => {
                        try {
                            await onSubmit(column.id, values.name.trim(), values.color, values.type);
                            onClose();
                        } catch (error) {
                            console.error("Failed to update column:", error);
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
                                    placeholder="e.g. In Review, Testing, Blocked..."
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
                                />
                                <ErrorMessage name="type" component="p" className="mt-2 text-sm font-medium text-red-500" />
                            </SettingsField>

                            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                                <Button
                                    type="button"
                                    onClick={() => setShowDeleteDialog(true)}
                                    disabled={column.is_default}
                                    variant="ghost"
                                    size="lg"
                                    className="w-full justify-center text-[var(--danger-fg)] hover:bg-[var(--danger-bg)] sm:w-auto"
                                    title={column.is_default ? "Cannot delete default columns" : "Delete column"}
                                >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    Delete
                                </Button>

                                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                                    <Button type="button" onClick={onClose} variant="ghost" size="lg" className="w-full sm:w-auto">
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting} size="lg" className="w-full sm:w-auto">
                                        {isSubmitting ? "Saving..." : "Save Changes"}
                                    </Button>
                                </div>
                            </div>
                        </Form>
                    )}
                </Formik>
            </ModalShell>

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
