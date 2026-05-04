"use client";

import { Formik, Form, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Trash2 } from "lucide-react";
import type { Column } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
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
    columns?: Column[];
    taskCount?: number;
    onClose: () => void;
    onSubmit: (columnId: string, name: string, color: string, type?: ColumnType) => Promise<void>;
    onDelete: (columnId: string, destinationColumnId?: string) => Promise<void>;
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

function getColumnTypeCounts(columns: Column[]) {
    return columns.reduce(
        (counts, item) => {
            const type = item.type || "default";
            counts[type] += 1;
            return counts;
        },
        { default: 0, in_progress: 0, done: 0 } as Record<ColumnType, number>,
    );
}

function getDisabledColumnTypes(column: Column, columns: Column[]): Partial<Record<ColumnType, string>> {
    const currentType = column.type || "default";
    const counts = getColumnTypeCounts(columns);
    const disabled: Partial<Record<ColumnType, string>> = {};

    if (currentType !== "done" && counts.done > 0) {
        disabled.done = "Only one Done column is allowed per board.";
    }

    if (currentType === "done" && counts.done <= 1) {
        disabled.default = "Board must keep at least one Done column.";
        disabled.in_progress = "Board must keep at least one Done column.";
    }

    if (currentType === "in_progress" && counts.in_progress <= 1) {
        disabled.default = "Board must keep at least one In Progress column.";
        disabled.done = "Board must keep at least one In Progress column.";
    }

    return disabled;
}

function getDeleteDisabledReason(column: Column, columns: Column[]) {
    const currentType = column.type || "default";
    const counts = getColumnTypeCounts(columns);

    if (currentType === "done" && counts.done <= 1) {
        return "Board must keep at least one Done column.";
    }

    if (currentType === "in_progress" && counts.in_progress <= 1) {
        return "Board must keep at least one In Progress column.";
    }

    return "";
}

export function EditColumnModal({ isOpen, column, columns = [], taskCount = 0, onClose, onSubmit, onDelete }: EditColumnModalProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const destinationColumns = useMemo(
        () => columns.filter((item) => item.id !== column.id),
        [column.id, columns],
    );
    const [destinationColumnId, setDestinationColumnId] = useState(destinationColumns[0]?.id || "");

    useEffect(() => {
        setDestinationColumnId(destinationColumns[0]?.id || "");
    }, [column.id, destinationColumns]);

    if (!isOpen) return null;

    const boardColumns = columns.length > 0 ? columns : [column];
    const disabledColumnTypes = getDisabledColumnTypes(column, boardColumns);
    const deleteDisabledReason = getDeleteDisabledReason(column, boardColumns);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete(column.id, taskCount > 0 ? destinationColumnId : undefined);
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
                                    disabledOptions={disabledColumnTypes}
                                />
                                <ErrorMessage name="type" component="p" className="mt-2 text-sm font-medium text-red-500" />
                            </SettingsField>

                            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                                <Button
                                    type="button"
                                    onClick={() => setShowDeleteDialog(true)}
                                    disabled={Boolean(deleteDisabledReason)}
                                    variant="ghost"
                                    size="lg"
                                    className="w-full justify-center text-[var(--danger-fg)] hover:bg-[var(--danger-bg)] sm:w-auto"
                                    title={deleteDisabledReason || "Delete column"}
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
                description={taskCount > 0
                    ? `This column contains ${taskCount} ${taskCount === 1 ? "task" : "tasks"}. Where should we move ${taskCount === 1 ? "it" : "them"}?`
                    : `Are you sure you want to delete "${column.name}"?`}
                confirmText={isDeleting ? "Deleting..." : "Delete"}
                isLoading={isDeleting}
            >
                {taskCount > 0 ? (
                    <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Move tasks to</span>
                        <select
                            value={destinationColumnId}
                            onChange={(event) => setDestinationColumnId(event.target.value)}
                            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                        >
                            {destinationColumns.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : null}
            </ConfirmationDialog>
        </>
    );
}
