import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { CalendarDays, ChartGantt, Check, ChevronsUpDown, Columns, FolderCog, List, SlidersHorizontal, Trash2, Users } from "lucide-react";
import type { RefObject, ReactNode } from "react";
import type { Column, Task } from "@/lib/types";
import type { DueDateFilter, TaskSortOption } from "@/lib/task-ui";
import { cn } from "@/lib/utils";

export type ProjectViewMode = "board" | "list" | "calendar" | "timeline";

export type ProjectFilterState = {
    columnIds: string[];
    priorities: Task["priority"][];
    assigneeIds: string[];
    labelIds: string[];
    dueDate: DueDateFilter;
};

const dueDateOptions: [DueDateFilter, string][] = [
    ["all", "All"],
    ["overdue", "Overdue"],
    ["upcoming", "Upcoming"],
    ["none", "No Due Date"],
];

function toggleSelection<T>(items: T[], value: T) {
    return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

export function ProjectViewModeSwitcher({
    viewMode,
    onChange,
    availableModes,
}: {
    viewMode: ProjectViewMode;
    onChange: (mode: ProjectViewMode) => void;
    availableModes?: ProjectViewMode[];
}) {
    const modes = ([
        ["board", "Board", Columns],
        ["list", "List", List],
        ["calendar", "Calendar", CalendarDays],
        ["timeline", "Timeline", ChartGantt],
    ] as const).filter(([value]) => !availableModes || availableModes.includes(value));

    return (
        <div
            className={cn(
                "grid gap-1 rounded-[0.95rem] border border-white/70 bg-white/78 p-1 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl md:flex md:items-center md:rounded-[1.1rem] md:p-1",
                modes.length >= 4 ? "grid-cols-4" : modes.length === 3 ? "grid-cols-3" : modes.length === 2 ? "grid-cols-2" : "grid-cols-1",
            )}
        >
            {modes.map(([value, label, Icon]) => (
                <button
                    key={value}
                    onClick={() => onChange(value)}
                    aria-label={`${label} view`}
                    className={cn(
                        "flex h-8 min-w-8 touch-manipulation items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-medium transition-[background-color,color,box-shadow] md:h-9 md:min-w-0 md:gap-2 md:px-3 md:text-sm",
                        viewMode === value
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                    )}
                    title={`${label} View`}
                >
                    <Icon className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
                    <span className="hidden md:inline">{label}</span>
                </button>
            ))}
        </div>
    );
}

export function ProjectMobileActionBar({
    viewMode,
    onViewChange,
    onOpenControls,
    isControlsOpen,
    hasActiveControls,
    controlsCount,
}: {
    viewMode: ProjectViewMode;
    onViewChange: (mode: ProjectViewMode) => void;
    onOpenControls: () => void;
    isControlsOpen: boolean;
    hasActiveControls: boolean;
    controlsCount: number;
}) {
    const viewLabels: Record<ProjectViewMode, string> = {
        board: "Board",
        list: "List",
        calendar: "Calendar",
        timeline: "Timeline",
    };
    const viewOptions: ProjectViewMode[] = ["board", "list", "calendar", "timeline"];

    return (
        <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+108px)] z-30 mx-auto flex h-[64px] max-w-sm items-center gap-2 rounded-[1.65rem] border border-white/80 bg-white/88 p-2 shadow-[0_22px_50px_-28px_rgba(15,23,42,0.38)] backdrop-blur-2xl md:hidden">
            <button
                type="button"
                onClick={onOpenControls}
                aria-label="Open project controls"
                className={cn(
                    "relative flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-[1.25rem] border-2 transition-[background-color,border-color,color,transform,box-shadow] active:scale-95",
                    hasActiveControls || isControlsOpen
                        ? "border-primary/45 bg-primary/10 text-primary shadow-[0_12px_24px_-20px_rgba(109,93,252,0.6)]"
                        : "border-slate-200/80 bg-white text-slate-500 hover:border-primary/35 hover:text-primary",
                )}
            >
                <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
                {controlsCount > 0 ? (
                    <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-bold text-primary-foreground">
                        {controlsCount}
                    </span>
                ) : null}
            </button>

            <Listbox value={viewMode} onChange={onViewChange}>
                <div className="relative min-w-0 flex-1">
                    <ListboxButton className="relative flex h-12 w-full touch-manipulation items-center justify-center rounded-[1.25rem] border border-slate-200/80 bg-white px-4 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_22px_-20px_rgba(15,23,42,0.34)] outline-none transition-[border-color,box-shadow] active:scale-[0.99] focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/20">
                        <span className="truncate pr-7 text-[17px] font-semibold">{viewLabels[viewMode]}</span>
                        <ChevronsUpDown className="absolute right-4 h-5 w-5 text-slate-700" aria-hidden="true" />
                    </ListboxButton>

                    <ListboxOptions
                        anchor="bottom"
                        className="z-[36] mt-2 w-[var(--button-width)] rounded-[1.15rem] border border-slate-200 bg-white/96 p-1.5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl focus:outline-none"
                    >
                        {viewOptions.map((option) => (
                            <ListboxOption
                                key={option}
                                value={option}
                                className={({ focus, selected }) => cn(
                                    "flex min-h-11 cursor-pointer select-none items-center justify-between rounded-xl px-3 text-sm font-semibold transition-colors",
                                    selected ? "bg-primary-dark text-white" : focus ? "bg-slate-100 text-slate-950" : "text-slate-600",
                                )}
                            >
                                {({ selected }) => (
                                    <>
                                        <span>{viewLabels[option]}</span>
                                        {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                                    </>
                                )}
                            </ListboxOption>
                        ))}
                    </ListboxOptions>
                </div>
            </Listbox>
        </div>
    );
}

export function ProjectControlsContent({
    columns,
    filters,
    setFilters,
    sortOption,
    setSortOption,
    sortLabels,
    availableAssignees,
    availableLabels,
    visibleTasksCount,
    totalTasksCount,
    onResetAll,
    onViewProject,
    onManageMembers,
    onDeleteProject,
    canManageProjectMembers,
    canDeleteProject,
}: {
    columns: Column[];
    filters: ProjectFilterState;
    setFilters: React.Dispatch<React.SetStateAction<ProjectFilterState>>;
    sortOption: TaskSortOption;
    setSortOption: React.Dispatch<React.SetStateAction<TaskSortOption>>;
    sortLabels: Record<TaskSortOption, string>;
    availableAssignees: NonNullable<Task["assignee"]>[];
    availableLabels: NonNullable<Task["labels"]>[number][];
    visibleTasksCount: number;
    totalTasksCount: number;
    onResetAll: () => void;
    onViewProject: () => void;
    onManageMembers: () => void;
    onDeleteProject: () => void;
    canManageProjectMembers: boolean;
    canDeleteProject: boolean;
}) {
    return (
        <div className="max-h-[min(calc(100dvh-20rem),34rem)] space-y-5 overflow-y-auto pr-1 md:max-h-[min(62vh,34rem)]">
            <div className="rounded-[1.15rem] border border-black/5 bg-white/76 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Summary</p>
                <p className="mt-1 text-sm text-foreground">
                    Showing {visibleTasksCount} of {totalTasksCount} tasks
                </p>
            </div>

            <div>
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sort</p>
                    {sortOption !== "default" && (
                        <button onClick={() => setSortOption("default")} className="text-xs font-medium text-primary">
                            Clear
                        </button>
                    )}
                </div>
                <div className="grid gap-2">
                    {(Object.entries(sortLabels) as [TaskSortOption, string][]).map(([value, label]) => {
                        const isActive = sortOption === value;
                        return (
                            <button
                                key={value}
                                onClick={() => setSortOption(value)}
                                className={cn(
                                    "flex min-h-11 w-full touch-manipulation items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors",
                                    isActive
                                        ? "border-primary/40 bg-primary/10 text-primary"
                                        : "border-border bg-[var(--surface-raised)] text-foreground hover:bg-muted/80",
                                )}
                            >
                                <span>{label}</span>
                                {isActive && <span className="text-xs font-semibold uppercase tracking-wide">Active</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-4">
                <ProjectChipGroup
                    label="Columns"
                    items={columns.map((column) => ({ id: column.id, label: column.name }))}
                    selectedIds={filters.columnIds}
                    onToggle={(columnId) => setFilters((prev) => ({ ...prev, columnIds: toggleSelection(prev.columnIds, columnId) }))}
                    emptyLabel="No columns available."
                />
                <ProjectChipGroup
                    label="Priority"
                    items={(["HIGH", "MEDIUM", "LOW"] as Task["priority"][]).map((priority) => ({
                        id: priority,
                        label: priority === "HIGH" ? "High" : priority === "MEDIUM" ? "Medium" : "Low",
                    }))}
                    selectedIds={filters.priorities}
                    onToggle={(priority) => setFilters((prev) => ({ ...prev, priorities: toggleSelection(prev.priorities, priority as Task["priority"]) }))}
                />
                <ProjectChipGroup
                    label="Assignee"
                    items={availableAssignees.map((assignee) => ({ id: assignee.id, label: assignee.name }))}
                    selectedIds={filters.assigneeIds}
                    onToggle={(assigneeId) => setFilters((prev) => ({ ...prev, assigneeIds: toggleSelection(prev.assigneeIds, assigneeId) }))}
                    emptyLabel="No assignees available."
                />
                <ProjectChipGroup
                    label="Due Date"
                    items={dueDateOptions.map(([id, label]) => ({ id, label }))}
                    selectedIds={[filters.dueDate]}
                    onToggle={(value) => setFilters((prev) => ({ ...prev, dueDate: value as DueDateFilter }))}
                    singleSelect
                />
                <ProjectChipGroup
                    label="Labels"
                    items={availableLabels.map((label) => ({ id: label.id, label: label.name }))}
                    selectedIds={filters.labelIds}
                    onToggle={(labelId) => setFilters((prev) => ({ ...prev, labelIds: toggleSelection(prev.labelIds, labelId) }))}
                    emptyLabel="No labels found on this project."
                />
            </div>

            <div>
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project</p>
                    <button onClick={onResetAll} className="text-xs font-medium text-primary">
                        Reset all
                    </button>
                </div>
                <div className="grid gap-2">
                    <button
                        onClick={onViewProject}
                        className="flex min-h-11 w-full touch-manipulation items-center justify-start gap-2 rounded-xl border border-border bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
                    >
                        <FolderCog className="h-4 w-4" />
                        View Project
                    </button>
                    {canManageProjectMembers ? (
                        <button
                            onClick={onManageMembers}
                            className="flex min-h-11 w-full touch-manipulation items-center justify-start gap-2 rounded-xl border border-border bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
                        >
                            <Users className="h-4 w-4" />
                            Manage Members
                        </button>
                    ) : null}
                    {canDeleteProject ? (
                        <button
                            onClick={onDeleteProject}
                            className="flex min-h-11 w-full touch-manipulation items-center justify-start gap-2 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm font-medium text-[var(--danger-fg)] transition-colors hover:opacity-90"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete Project
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function ProjectChipGroup({
    label,
    items,
    selectedIds,
    onToggle,
    emptyLabel,
    singleSelect = false,
}: {
    label: string;
    items: Array<{ id: string; label: string }>;
    selectedIds: string[];
    onToggle: (id: string) => void;
    emptyLabel?: string;
    singleSelect?: boolean;
}) {
    return (
        <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <div className="flex flex-wrap gap-2">
                {items.length > 0 ? (
                    items.map((item) => {
                        const isActive = selectedIds.includes(item.id);
                        return (
                            <button
                                key={item.id}
                                onClick={() => onToggle(singleSelect && isActive ? "all" : item.id)}
                                className={cn(
                                    "min-h-10 touch-manipulation rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                                    isActive
                                        ? "border-primary/40 bg-primary/10 text-primary"
                                        : "border-border bg-[var(--surface-raised)] text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {item.label}
                            </button>
                        );
                    })
                ) : (
                    <p className="text-xs text-muted-foreground">{emptyLabel ?? "No items available."}</p>
                )}
            </div>
        </div>
    );
}

export function ProjectControlsTrigger({
    isOpen,
    hasActiveControls,
    count,
    onClick,
    className,
    label,
    showLabel = true,
}: {
    isOpen: boolean;
    hasActiveControls: boolean;
    count: number;
    onClick: () => void;
    className?: string;
    label?: ReactNode;
    showLabel?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            aria-label="Open project controls"
            className={cn(
                "relative flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                hasActiveControls || isOpen
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-[var(--surface-raised)] text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                className,
            )}
        >
            <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
            {showLabel ? (label ?? "Controls") : null}
            {count > 0 ? (
                <span
                    className={cn(
                        "rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground",
                        !showLabel && "absolute -right-1 -top-1 min-w-5 text-center",
                    )}
                >
                    {count}
                </span>
            ) : null}
        </button>
    );
}

export function ProjectControlsPopover({
    isOpen,
    title,
    description,
    children,
    className,
}: {
    isOpen: boolean;
    title: string;
    description: string;
    children: ReactNode;
    className?: string;
}) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className={cn("rounded-[1.25rem] border border-border bg-card p-4 shadow-[0_18px_40px_-20px_rgb(var(--shadow-color)/0.25)]", className)}>
            <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </div>
            {children}
        </div>
    );
}
