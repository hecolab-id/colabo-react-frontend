import { Column, Task, TaskPriority, TaskStatus } from "@/lib/types";

export const taskDateFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
});

export const taskDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
});

export function formatTaskDate(value?: string | null) {
    if (!value) return "";
    return taskDateFormatter.format(new Date(value));
}

export function formatTaskDateTime(value?: string | null) {
    if (!value) return "";
    return taskDateTimeFormatter.format(new Date(value));
}

type PriorityTone = {
    label: string;
    badgeClassName: string;
    iconClassName: string;
    textClassName: string;
    highAccentClassName?: string;
};

export const priorityToneMap: Record<TaskPriority, PriorityTone> = {
    HIGH: {
        label: "High Priority",
        badgeClassName: "border border-[var(--priority-high-border)] bg-[var(--priority-high-bg)] text-[var(--priority-high-fg)]",
        iconClassName: "text-[var(--priority-high-fg)]",
        textClassName: "text-[var(--priority-high-fg)]",
        highAccentClassName: "after:absolute after:inset-x-4 after:top-0 after:h-1 after:rounded-b-full after:bg-gradient-to-r after:from-[#bd2f5f] after:via-[#e5557a] after:to-[#f19ab0]",
    },
    MEDIUM: {
        label: "Medium",
        badgeClassName: "border border-[var(--priority-medium-border)] bg-[var(--priority-medium-bg)] text-[var(--priority-medium-fg)]",
        iconClassName: "text-[var(--priority-medium-fg)]",
        textClassName: "text-[var(--priority-medium-fg)]",
    },
    LOW: {
        label: "Low",
        badgeClassName: "border border-[var(--priority-low-border)] bg-[var(--priority-low-bg)] text-[var(--priority-low-fg)]",
        iconClassName: "text-[var(--priority-low-fg)]",
        textClassName: "text-[var(--priority-low-fg)]",
    },
};

export function getPriorityTone(priority?: TaskPriority | null) {
    return priorityToneMap[priority as TaskPriority] || priorityToneMap.MEDIUM;
}

export const statusToneMap: Record<TaskStatus, { label: string; className: string; textClassName: string }> = {
    TODO: {
        label: "To Do",
        className: "border border-[var(--status-todo-border)] bg-[var(--status-todo-bg)] text-[var(--status-todo-fg)]",
        textClassName: "text-[var(--status-todo-fg)]",
    },
    IN_PROGRESS: {
        label: "In Progress",
        className: "border border-[var(--status-in-progress-border)] bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-fg)]",
        textClassName: "text-[var(--status-in-progress-fg)]",
    },
    DONE: {
        label: "Done",
        className: "border border-[var(--status-done-border)] bg-[var(--status-done-bg)] text-[var(--status-done-fg)]",
        textClassName: "text-[var(--status-done-fg)]",
    },
    BACKLOG: {
        label: "Backlog",
        className: "border border-[var(--status-backlog-border)] bg-[var(--status-backlog-bg)] text-[var(--status-backlog-fg)]",
        textClassName: "text-[var(--status-backlog-fg)]",
    },
};

export function getStatusTone(status?: TaskStatus | null) {
    return statusToneMap[status as TaskStatus] || statusToneMap.TODO;
}

export function getDueDateTone(date?: string | null) {
    if (!date) {
        return {
            className: "bg-muted text-muted-foreground border border-border",
            label: null as string | null,
            isOverdue: false,
        };
    }

    const dueDate = new Date(date);
    const now = new Date();
    const isOverdue = dueDate < now;
    const isDueSoon = !isOverdue && dueDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000;

    if (isOverdue) {
        return {
            className: "kanban-overdue-date border border-[#f0a8b2] bg-[#fff0f3] text-[#b8204f] font-semibold",
            label: "Overdue",
            isOverdue: true,
        };
    }

    if (isDueSoon) {
        return {
            className: "border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-fg)]",
            label: "Due Soon",
            isOverdue: false,
        };
    }

    return {
        className: "bg-muted text-muted-foreground border border-border",
        label: null as string | null,
        isOverdue: false,
    };
}

export type DueDateFilter = "all" | "overdue" | "upcoming" | "none";
export type TaskSortOption = "default" | "due_date" | "priority" | "updated_at";
export type CalendarDateBasis = "due" | "created";

const STATUS_TO_COLUMN_NAME: Record<string, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Done",
    BACKLOG: "Backlog",
};

const priorityRank: Record<TaskPriority, number> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
};

export function getTaskColumnId(task: Task, columns: Column[]): string {
    if (task.column_id) return task.column_id;

    const columnName = STATUS_TO_COLUMN_NAME[task.status] || "To Do";
    const column = columns.find((item) => item.name === columnName);
    return column?.id || columns[0]?.id || "";
}

export function matchesDueDateFilter(task: Task, dueDateFilter: DueDateFilter, now = new Date()) {
    if (dueDateFilter === "all") return true;
    if (!task.due_date) return dueDateFilter === "none";

    const dueDate = new Date(task.due_date);
    if (dueDateFilter === "overdue") return dueDate < now;
    if (dueDateFilter === "upcoming") return dueDate >= now;
    return false;
}

export function sortTasks(tasks: Task[], columns: Column[], sortOption: TaskSortOption) {
    const columnOrder = new Map(columns.map((column, index) => [column.id, column.order ?? index]));

    return [...tasks].sort((left, right) => {
        const leftColumnId = getTaskColumnId(left, columns);
        const rightColumnId = getTaskColumnId(right, columns);

        if (sortOption === "default") {
            const leftColumnOrder = columnOrder.get(leftColumnId) ?? Number.MAX_SAFE_INTEGER;
            const rightColumnOrder = columnOrder.get(rightColumnId) ?? Number.MAX_SAFE_INTEGER;

            if (leftColumnOrder !== rightColumnOrder) {
                return leftColumnOrder - rightColumnOrder;
            }

            if (left.position !== right.position) {
                return left.position - right.position;
            }

            return left.title.localeCompare(right.title);
        }

        if (leftColumnId !== rightColumnId) {
            const leftColumnOrder = columnOrder.get(leftColumnId) ?? Number.MAX_SAFE_INTEGER;
            const rightColumnOrder = columnOrder.get(rightColumnId) ?? Number.MAX_SAFE_INTEGER;
            return leftColumnOrder - rightColumnOrder;
        }

        if (sortOption === "due_date") {
            const leftDue = left.due_date ? new Date(left.due_date).getTime() : Number.POSITIVE_INFINITY;
            const rightDue = right.due_date ? new Date(right.due_date).getTime() : Number.POSITIVE_INFINITY;

            if (leftDue !== rightDue) {
                return leftDue - rightDue;
            }
        }

        if (sortOption === "priority") {
            const leftRank = priorityRank[left.priority];
            const rightRank = priorityRank[right.priority];

            if (leftRank !== rightRank) {
                return leftRank - rightRank;
            }
        }

        if (sortOption === "updated_at") {
            const leftUpdated = new Date(left.updated_at).getTime();
            const rightUpdated = new Date(right.updated_at).getTime();

            if (leftUpdated !== rightUpdated) {
                return rightUpdated - leftUpdated;
            }
        }

        if (left.position !== right.position) {
            return left.position - right.position;
        }

        return left.title.localeCompare(right.title);
    });
}

export function getTaskCalendarDate(task: Task, basis: CalendarDateBasis) {
    if (basis === "created") {
        return task.created_at || null;
    }

    return task.due_date || null;
}

export function getLocalDateKey(value?: string | null) {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export function groupTasksByCalendarDate(tasks: Task[], basis: CalendarDateBasis) {
    return tasks.reduce<Record<string, Task[]>>((acc, task) => {
        const dateKey = getLocalDateKey(getTaskCalendarDate(task, basis));
        if (!dateKey) {
            return acc;
        }

        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }

        acc[dateKey].push(task);
        return acc;
    }, {});
}

export function getMonthGridDates(monthDate: Date) {
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - start.getDay());

    const gridEnd = new Date(end);
    gridEnd.setDate(end.getDate() + (6 - end.getDay()));

    const dates: Date[] = [];
    const cursor = new Date(gridStart);

    while (cursor <= gridEnd) {
        dates.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
}
