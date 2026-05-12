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
    variant = "field",
    rowLabel,
}: {
    value: string;
    onChange: (value: string) => void;
    options: ListboxOptionItem[];
    placeholder: string;
    disabled?: boolean;
    variant?: "field" | "row";
    rowLabel?: string;
}) {
    const selectedOption = options.find((opt) => opt.value === value);
    const isRow = variant === "row";

    return (
        <Listbox value={value} onChange={onChange} disabled={disabled}>
            <div className="relative">
                <ListboxButton
                    className={cn(
                        "relative flex h-12 w-full appearance-none items-center border border-slate-200/80 bg-white/90 px-4 text-left text-[15px] font-medium text-slate-900 shadow-none transition-[border-color,box-shadow,background-color] focus:border-primary/35 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60",
                        isRow
                            ? "justify-between rounded-[1rem]"
                            : "rounded-[1.05rem] sm:rounded-2xl sm:bg-slate-50 sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:focus:bg-slate-100",
                    )}
                >
                    {isRow ? (
                        <>
                            <span className="shrink-0 text-[12px] font-semibold text-slate-400">{rowLabel}</span>
                            <span className="ml-4 flex min-w-0 items-center justify-end gap-2.5 pr-6 text-right">
                                {selectedOption?.leading ? (
                                    <span className="flex shrink-0 items-center">{selectedOption.leading}</span>
                                ) : null}
                                <span className={cn("block truncate", !selectedOption && "text-slate-400")}>
                                    {selectedOption ? selectedOption.label : placeholder}
                                </span>
                            </span>
                        </>
                    ) : (
                        <span className="flex min-w-0 items-center gap-2.5 pr-6">
                            {selectedOption?.leading ? (
                                <span className="flex shrink-0 items-center">{selectedOption.leading}</span>
                            ) : null}
                            <span className={cn("block truncate", !selectedOption && "text-slate-400")}>
                                {selectedOption ? selectedOption.label : placeholder}
                            </span>
                        </span>
                    )}
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                        <ChevronDown className="h-4 w-4 text-slate-400 focus:text-slate-900" aria-hidden="true" />
                    </span>
                </ListboxButton>

                <ListboxOptions
                    transition
                    className="absolute z-[90] mt-2 max-h-60 w-full overflow-auto rounded-[1.25rem] border border-slate-200 bg-white p-1.5 text-[15px] shadow-[0_22px_54px_-30px_rgba(15,23,42,0.48)] focus:outline-none origin-top transition duration-150 ease-out data-[closed]:scale-[0.98] data-[closed]:opacity-0 sm:rounded-[1.4rem]"
                >
                    {options.map((option) => (
                        <ListboxOption
                            key={option.value}
                            value={option.value}
                            className={({ focus }) =>
                                cn(
                                    "relative flex min-h-11 cursor-pointer select-none items-center rounded-[1rem] py-2.5 transition-colors",
                                    option.leading ? "pl-3 pr-9" : "pl-10 pr-4",
                                    focus ? "bg-primary/10 text-slate-950" : "text-slate-700"
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
                                                "absolute inset-y-0 flex items-center text-primary",
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
    const [hasTriedSubmit, setHasTriedSubmit] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setTitle("");
        setProjectId(initialProjectId);
        setStatus(initialStatus);
        setSelectedColumnId(seededColumnId || "");
        setAvailableColumns(projectColumns || []);
        setAssigneeId(initialAssigneeId);
        setHasTriedSubmit(false);
        
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
    const hasTitle = title.trim().length > 0;
    const titleError = hasTriedSubmit && !hasTitle ? "Task title is required" : "";
    const canSubmit = hasTitle && projectId.length > 0 && !isSubmitting && !isColumnsLoading;
    const isSubmitDisabled = projectId.length === 0 || isSubmitting || isColumnsLoading;
    const shouldShowProjectField = !lockProjectSelection;
    const detailLabel = columnOptions.length > 0 ? "Column" : "Status";

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setHasTriedSubmit(true);
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
            setHasTriedSubmit(false);
        }
    };

    return (
        <ModalShell
            title="Create Task"
            onClose={onClose}
            maxWidthClassName="max-w-md"
            contentClassName="max-h-[82dvh] overflow-hidden border-white/90 bg-white/95 shadow-[0_-18px_54px_-28px_rgba(15,23,42,0.28)] backdrop-blur-md sm:max-h-[92dvh] sm:bg-white/88 sm:shadow-[0_30px_100px_rgba(15,23,42,0.18)]"
            bodyClassName="flex max-h-[82dvh] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 sm:max-h-[92dvh] sm:p-8 [&>div:first-child]:mb-4 sm:[&>div:first-child]:mb-8 [&_h2]:text-[21px] sm:[&_h2]:text-[28px] [&>div:first-child_button]:h-9 [&>div:first-child_button]:w-9 sm:[&>div:first-child_button]:h-10 sm:[&>div:first-child_button]:w-10"
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
                    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-0.5 pb-3 [scrollbar-width:none] [-ms-overflow-style:none] sm:space-y-6 sm:px-1 [&::-webkit-scrollbar]:hidden">
                            {successMessage && (
                                <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 animate-in fade-in duration-200 sm:gap-3 sm:rounded-[20px] sm:p-4">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 sm:h-8 sm:w-8">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <p className="text-[13px] font-medium leading-5 text-emerald-800 sm:text-sm">{successMessage}</p>
                                </div>
                            )}

                            <div className="sm:hidden">
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => {
                                        setTitle(e.target.value);
                                        if (e.target.value.trim()) {
                                            setHasTriedSubmit(false);
                                        }
                                    }}
                                    placeholder="What needs doing?"
                                    autoFocus
                                    className={cn(
                                        "block h-14 w-full rounded-[1rem] border bg-slate-50/80 px-4 text-[17px] font-semibold leading-none text-slate-950 shadow-none outline-none transition-[border-color,box-shadow,background-color] placeholder:font-medium placeholder:text-slate-400 focus:border-primary/45 focus:bg-white focus:shadow-[inset_0_0_0_2px_rgba(109,93,252,0.22)] focus-visible:!ring-0 focus-visible:!ring-offset-0",
                                        titleError ? "border-[var(--danger-border)] shadow-[inset_0_0_0_3px_rgba(179,66,66,0.14)]" : "border-slate-200/80",
                                    )}
                                />
                                {titleError ? (
                                    <p className="mt-2 px-1 text-[12px] font-semibold text-[var(--danger-fg)]">{titleError}</p>
                                ) : null}
                            </div>

                            <SettingsField label="Task Title" className="hidden sm:block">
                                <Input
                                    type="text"
                                    value={title}
                                    onChange={(e) => {
                                        setTitle(e.target.value);
                                        if (e.target.value.trim()) {
                                            setHasTriedSubmit(false);
                                        }
                                    }}
                                    placeholder="What needs to be done?"
                                    autoFocus
                                    className="h-12 rounded-[1.05rem] border-slate-200/80 bg-white/90 text-[15px] shadow-none transition-[border-color,box-shadow,background-color] focus-visible:border-primary/35 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/15 sm:h-12 sm:rounded-2xl sm:bg-white/78"
                                />
                                {titleError ? (
                                    <p className="mt-2 text-[12px] font-semibold text-[var(--danger-fg)]">{titleError}</p>
                                ) : null}
                            </SettingsField>

                            <div className="space-y-2 sm:hidden">
                                {shouldShowProjectField ? (
                                    <CustomListbox
                                        variant="row"
                                        rowLabel="Project"
                                        value={projectId}
                                        onChange={(value) => {
                                            setProjectId(value);
                                            setSelectedColumnId("");
                                        }}
                                        disabled={projects.length === 0}
                                        placeholder="Select a project directory"
                                        options={projects.map((p) => ({ value: p.id, label: p.name }))}
                                    />
                                ) : null}
                                <CustomListbox
                                    variant="row"
                                    rowLabel={detailLabel}
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
                                <CustomListbox
                                    variant="row"
                                    rowLabel="Assignee"
                                    value={assigneeId}
                                    onChange={setAssigneeId}
                                    placeholder="Unassigned"
                                    options={assignees.map((a) => ({
                                        value: a.id,
                                        label: a.name,
                                        leading: <Avatar user={a} size="xs" />,
                                    }))}
                                />
                            </div>

                            {shouldShowProjectField ? (
                                <SettingsField label="Parent Project" className="relative z-[70] hidden sm:block">
                                    <CustomListbox
                                        value={projectId}
                                        onChange={(value) => {
                                            setProjectId(value);
                                            setSelectedColumnId("");
                                        }}
                                        disabled={projects.length === 0}
                                        placeholder="Select a project directory"
                                        options={projects.map((p) => ({ value: p.id, label: p.name }))}
                                    />
                                </SettingsField>
                            ) : null}

                            <div className="relative z-20 hidden grid-cols-1 gap-3 sm:grid sm:grid-cols-2 sm:gap-4">
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

                                <SettingsField label={detailLabel} className="relative z-20">
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
                        </div>

                        <div className="relative z-0 mt-3 border-t border-slate-200/70 bg-white/95 pt-3 backdrop-blur-xl sm:mt-4 sm:flex sm:flex-row-reverse sm:gap-3 sm:border-0 sm:bg-transparent sm:pt-0 sm:shadow-none">
                            <Button
                                type="button"
                                onClick={onClose}
                                variant="ghost"
                                size="lg"
                                className="hidden h-12 w-full text-slate-500 hover:bg-slate-50 sm:inline-flex sm:w-auto sm:px-6 sm:hover:bg-transparent"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitDisabled}
                                size="lg"
                                className="!h-12 !min-h-12 w-full rounded-[1.15rem] text-[15px] shadow-[0_18px_36px_rgba(109,93,252,0.24)] active:scale-[0.99] sm:flex-1 sm:rounded-full"
                            >
                                {isSubmitting ? "Creating..." : "Create Task"}
                            </Button>
                        </div>
                    </form>
                )}
        </ModalShell>
    );
}
