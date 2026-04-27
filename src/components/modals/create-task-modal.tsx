"use client";

import { useEffect, useState } from "react";
import { FolderPlus, X, CheckCircle2, Check, ChevronDown } from "lucide-react";
import { Project, TaskStatus, User } from "@/lib/types";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { SettingsField } from "@/components/ui/settings-field";

export type CreateTaskFormValues = {
    title: string;
    projectId: string;
    status: TaskStatus;
    columnId?: string;
    assigneeId?: string;
};

type ProjectOption = Pick<Project, "id" | "name" | "slug">;
type AssigneeOption = Pick<User, "id" | "name" | "email">;

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
    { value: "TODO", label: "To Do" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "DONE", label: "Done" },
    { value: "BACKLOG", label: "Backlog" },
];

function CustomListbox({
    value,
    onChange,
    options,
    placeholder,
    disabled = false,
}: {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder: string;
    disabled?: boolean;
}) {
    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <Listbox value={value} onChange={onChange} disabled={disabled}>
            <div className="relative">
                <ListboxButton className="relative w-full appearance-none px-4 py-3.5 rounded-2xl border-0 bg-slate-50 text-slate-900 text-left text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-slate-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                    <span className={cn("block truncate", !selectedOption && "text-slate-400")}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                        <ChevronDown className="h-4 w-4 text-slate-400 focus:text-slate-900" aria-hidden="true" />
                    </span>
                </ListboxButton>
                
                <ListboxOptions 
                    transition 
                    className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-[1.4rem] border border-white/80 bg-white/92 p-1.5 text-[15px] shadow-[0_24px_60px_-24px_rgba(15,23,42,0.28)] backdrop-blur-2xl focus:outline-none origin-top transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
                >
                    {options.map((option) => (
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

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (values: CreateTaskFormValues) => Promise<unknown>;
    projects: ProjectOption[];
    initialProjectId?: string;
    initialStatus?: TaskStatus;
    seededColumnId?: string;
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
    const [assigneeId, setAssigneeId] = useState(initialAssigneeId);

    // Track input focus for mobile keyboard adjustments if needed
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setTitle("");
        setProjectId(initialProjectId);
        setStatus(initialStatus);
        setAssigneeId(initialAssigneeId);
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [initialAssigneeId, initialProjectId, initialStatus, isOpen]);

    const canSubmit = title.trim().length > 0 && projectId.length > 0 && !isSubmitting;

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) {
            return;
        }

        await onSubmit({
            title: title.trim(),
            projectId,
            status,
            columnId: seededColumnId,
            assigneeId: assigneeId || undefined,
        });

        if (resetOnSuccess) {
            setTitle("");
            setProjectId(initialProjectId);
            setStatus(initialStatus);
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
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center mb-2">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm border border-black/5">
                            <FolderPlus className="h-8 w-8 text-slate-400" aria-hidden="true" />
                        </div>
                        <h3 className="mt-5 text-lg font-semibold text-slate-900">Workspace required</h3>
                        <p className="mx-auto mt-2 text-sm leading-relaxed text-slate-500 text-balance">
                            Create your first project block before delegating assignments.
                        </p>
                        <div className="mt-8 flex flex-col gap-3">
                            <Button
                                type="button"
                                onClick={onCreateProject}
                                size="lg"
                                className="w-full"
                            >
                                Setup New Project
                            </Button>
                            <Button
                                type="button"
                                onClick={onClose}
                                variant="ghost"
                                size="lg"
                                className="w-full"
                            >
                                Not Right Now
                            </Button>
                        </div>
                    </div>
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

                        <SettingsField label="Parent Project" className="relative z-30">
                            <CustomListbox
                                value={projectId}
                                onChange={setProjectId}
                                disabled={lockProjectSelection || projects.length === 0}
                                placeholder="Select a project directory"
                                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                            />
                        </SettingsField>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-4 relative z-20">
                            <SettingsField label="Delegate To">
                                <CustomListbox
                                    value={assigneeId}
                                    onChange={setAssigneeId}
                                    placeholder="Leave Unassigned"
                                    options={assignees.map((a) => ({ value: a.id, label: a.name }))}
                                />
                            </SettingsField>

                            <SettingsField label="Status">
                                <CustomListbox
                                    value={status}
                                    onChange={(v) => setStatus(v as TaskStatus)}
                                    placeholder="Select status"
                                    options={statusOptions}
                                />
                            </SettingsField>
                        </div>

                        <div className="pt-4 flex flex-col-reverse sm:flex-row gap-3">
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
