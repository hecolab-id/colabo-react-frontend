"use client";

import { ReactNode, useEffect, useState } from "react";
import { FolderPlus, X, CheckCircle2, Check, ChevronDown } from "lucide-react";
import { Column, Project, TaskStatus, User } from "@/lib/types";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { SettingsField } from "@/components/ui/settings-field";
import { getProjectColumns } from "@/lib/api";

export type CreateTaskFormValues = {
    title: string;
    projectId: string;
    status: TaskStatus;
    columnId?: string;
    assigneeId?: string;
};

type ProjectOption = Pick<Project, "id" | "name" | "slug">;
type AssigneeOption = Pick<User, "id" | "name" | "email" | "avatar_url">;

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
    { value: "TODO", label: "To Do" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "DONE", label: "Done" },
    { value: "BACKLOG", label: "Backlog" },
];

function getStatusFromColumn(column: Column | undefined, fallback: TaskStatus): TaskStatus {
    if (!column) return fallback;
    if (column.type === "done") return "DONE";
    if (column.type === "in_progress") return "IN_PROGRESS";

    const normalizedName = column.name.trim().toUpperCase().replace(/\s+/g, "_");
    if (normalizedName === "IN_PROGRESS" || normalizedName === "DONE" || normalizedName === "BACKLOG" || normalizedName === "TODO") {
        return normalizedName;
    }

    return "TODO";
}

type ListboxOptionItem = { value: string; label: string; leading?: ReactNode };

function CustomListbox({
    value,
    onChange,
    options,
    placeholder,
    disabled = false,
}: {
    value: string;
    onChange: (value: string) => void;
    options: ListboxOptionItem[];
    placeholder: string;
    disabled?: boolean;
}) {
    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <Listbox value={value} onChange={onChange} disabled={disabled}>
            <div className="relative">
                <ListboxButton className="relative w-full appearance-none px-4 py-3.5 rounded-2xl border-0 bg-slate-50 text-slate-900 text-left text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-slate-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                    <span className="flex min-w-0 items-center gap-2.5 pr-6">
                        {selectedOption?.leading ? (
                            <span className="flex shrink-0 items-center">{selectedOption.leading}</span>
                        ) : null}
                        <span className={cn("block truncate", !selectedOption && "text-slate-400")}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                        <ChevronDown className="h-4 w-4 text-slate-400 focus:text-slate-900" aria-hidden="true" />
                    </span>
                </ListboxButton>

                <ListboxOptions
                    transition
                    className="absolute z-[90] mt-2 max-h-60 w-full overflow-auto rounded-[1.4rem] border border-slate-200 bg-white p-1.5 text-[15px] shadow-[0_30px_80px_-28px_rgba(15,23,42,0.55)] focus:outline-none origin-top transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
                >
                    {options.map((option) => (
                        <ListboxOption
                            key={option.value}
                            value={option.value}
                            className={({ focus }) =>
                                cn(
                                    "relative cursor-pointer select-none rounded-[1rem] py-3 transition-colors",
                                    option.leading ? "pl-3 pr-9" : "pl-10 pr-4",
                                    focus ? "bg-slate-100/90 text-slate-900" : "text-slate-700"
                                )
                            }
                        >
                            {({ selected }) => (
                                <>
                                    <span className="flex min-w-0 items-center gap-2.5">
                                        {option.leading ? (
                                            <span className="flex shrink-0 items-center">{option.leading}</span>
                                        ) : null}
                                        <span className={cn("block truncate", selected ? "font-semibold text-slate-900" : "font-medium")}>
                                            {option.label}
                                        </span>
                                    </span>
                                    {selected ? (
                                        <span
                                            className={cn(
                                                "absolute inset-y-0 flex items-center text-slate-900",
                                                option.leading ? "right-0 pr-3" : "left-0 pl-3"
                                            )}
                                        >
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

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (values: CreateTaskFormValues) => Promise<unknown>;
    projects: ProjectOption[];
    initialProjectId?: string;
    initialStatus?: TaskStatus;
    seededColumnId?: string;
    projectColumns?: Column[];
    lockProjectSelection?: boolean;
    isSubmitting?: boolean;
    onCreateProject?: () => void;
    assignees?: AssigneeOption[];
    initialAssigneeId?: string;
    successMessage?: string | null;
    resetOnSuccess?: boolean;
}

export function CreateTaskModal({
    isOpen,
    onClose,
    onSubmit,
    projects,
    initialProjectId = "",
    initialStatus = "TODO",
    seededColumnId,
    projectColumns,
    lockProjectSelection = false,
    isSubmitting = false,
    onCreateProject,
    assignees = [],
    initialAssigneeId = "",
    successMessage,
    resetOnSuccess = false,
}: CreateTaskModalProps) {
    const [title, setTitle] = useState("");
    const [projectId, setProjectId] = useState(initialProjectId);
    const [status, setStatus] = useState<TaskStatus>(initialStatus);
    const [selectedColumnId, setSelectedColumnId] = useState(seededColumnId || "");
    const [availableColumns, setAvailableColumns] = useState<Column[]>(projectColumns || []);
    const [isColumnsLoading, setIsColumnsLoading] = useState(false);
    const [assigneeId, setAssigneeId] = useState(initialAssigneeId);

    // Track input focus for mobile keyboard adjustments if needed
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setTitle("");
        setProjectId(initialProjectId);
        setStatus(initialStatus);
        setSelectedColumnId(seededColumnId || "");
        setAvailableColumns(projectColumns || []);
        setAssigneeId(initialAssigneeId);
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [initialAssigneeId, initialProjectId, initialStatus, isOpen, projectColumns, seededColumnId]);

    useEffect(() => {
        if (!isOpen || !projectId) {
            return;
        }

        const canUseProvidedColumns = projectColumns && projectId === initialProjectId;
        if (canUseProvidedColumns) {
            const sortedColumns = [...projectColumns].sort((left, right) => left.order - right.order);
            setAvailableColumns(sortedColumns);
            setSelectedColumnId((current) => current || seededColumnId || sortedColumns[0]?.id || "");
            return;
        }

        let isActive = true;
        setIsColumnsLoading(true);

        getProjectColumns(projectId)
            .then((columns) => {
                if (!isActive) return;
                const sortedColumns = [...columns].sort((left, right) => left.order - right.order);
                setAvailableColumns(sortedColumns);
                setSelectedColumnId((current) => {
                    if (sortedColumns.some((column) => column.id === current)) {
                        return current;
                    }

                    return sortedColumns[0]?.id || "";
                });
            })
            .catch((error) => {
                if (!isActive) return;
                console.error("Failed to load project columns", error);
                setAvailableColumns([]);
                setSelectedColumnId("");
            })
            .finally(() => {
                if (isActive) {
                    setIsColumnsLoading(false);
                }
            });

        return () => {
            isActive = false;
        };
    }, [initialProjectId, isOpen, projectColumns, projectId, seededColumnId]);

    const columnOptions = availableColumns.map((column) => ({ value: column.id, label: column.name }));
    const selectedColumn = availableColumns.find((column) => column.id === selectedColumnId);
    const canSubmit = title.trim().length > 0 && projectId.length > 0 && !isSubmitting && !isColumnsLoading;

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) {
            return;
        }

        const nextStatus = getStatusFromColumn(selectedColumn, status);

        await onSubmit({
            title: title.trim(),
            projectId,
            status: nextStatus,
            columnId: selectedColumnId || seededColumnId,
            assigneeId: assigneeId || undefined,
        });

        if (resetOnSuccess) {
            setTitle("");
            setProjectId(initialProjectId);
            setStatus(initialStatus);
            setSelectedColumnId(seededColumnId || availableColumns[0]?.id || "");
            setAssigneeId(initialAssigneeId);
        }
    };

    return (
        <ModalShell
            title="New Assignment"
            description={!successMessage ? "Add a task to your execution queue." : undefined}
            onClose={onClose}
            maxWidthClassName="max-w-md"
            contentClassName="max-h-[90dvh] overflow-y-visible scrollbar-hide"
        >
                {projects.length === 0 ? (
                    <EmptyState
                        className="mb-2"
                        icon={<FolderPlus className="h-8 w-8 text-slate-400" aria-hidden="true" />}
                        title="Workspace required"
                        description="Create your first project block before delegating assignments."
                        action={
                            <div className="flex w-full flex-col gap-3">
                                <Button type="button" onClick={onCreateProject} size="lg" className="w-full">
                                    Setup New Project
                                </Button>
                                <Button type="button" onClick={onClose} variant="ghost" size="lg" className="w-full">
                                    Not Right Now
                                </Button>
                            </div>
                        }
                    />
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 block">
                        {successMessage && (
                            <div className="flex items-center gap-3 rounded-[20px] border border-emerald-100 bg-emerald-50/50 p-4 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                                <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
                            </div>
                        )}

                        <SettingsField label="Task Title">
                            <Input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="e.g. Implement login flow..."
                                required
                                autoFocus
                            />
                        </SettingsField>

                        <SettingsField label="Parent Project" className="relative z-[70]">
                            <CustomListbox
                                value={projectId}
                                onChange={(value) => {
                                    setProjectId(value);
                                    setSelectedColumnId("");
                                }}
                                disabled={lockProjectSelection || projects.length === 0}
                                placeholder="Select a project directory"
                                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                            />
                        </SettingsField>

                        <div className="relative z-20 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
                            <SettingsField label="Delegate To" className="relative z-30">
                                <CustomListbox
                                    value={assigneeId}
                                    onChange={setAssigneeId}
                                    placeholder="Leave Unassigned"
                                    options={assignees.map((a) => ({
                                        value: a.id,
                                        label: a.name,
                                        leading: <Avatar user={a} size="xs" />,
                                    }))}
                                />
                            </SettingsField>

                            <SettingsField label="Status" className="relative z-20">
                                <CustomListbox
                                    value={selectedColumnId || status}
                                    onChange={(value) => {
                                        if (columnOptions.length > 0) {
                                            setSelectedColumnId(value);
                                            setStatus(getStatusFromColumn(availableColumns.find((column) => column.id === value), status));
                                        } else {
                                            setStatus(value as TaskStatus);
                                        }
                                    }}
                                    disabled={isColumnsLoading}
                                    placeholder={isColumnsLoading ? "Loading columns..." : "Select column"}
                                    options={columnOptions.length > 0 ? columnOptions : statusOptions}
                                />
                            </SettingsField>
                        </div>

                        <div className="relative z-0 pt-4 flex flex-col-reverse sm:flex-row gap-3">
                            <Button
                                type="button"
                                onClick={onClose}
                                variant="ghost"
                                size="lg"
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!canSubmit}
                                size="lg"
                                className="w-full flex-1"
                            >
                                {isSubmitting ? "Executing..." : "Publish Task"}
                            </Button>
                        </div>
                        
                        {/* Fake padding for mobile bottom area if focused */}
                        {isFocused && <div className="h-52 sm:hidden transition-all duration-300 pointer-events-none" />}
                    </form>
                )}
        </ModalShell>
    );
}
