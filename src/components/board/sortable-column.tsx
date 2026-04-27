"use client";

import { memo, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Column, Task } from "@/lib/types";
import { BoardColumn } from "./board-column";
import { cn } from "@/lib/utils";

interface SortableColumnProps {
    column: Column;
    tasks: Task[];
    onTaskClick?: (taskId: string) => void;
    onAddTask?: () => void;
    onEditColumn?: (column: Column) => void;
    isBoardDragging?: boolean;
    isTaskDragging?: boolean;
    isColumnDragging?: boolean;
}

function SortableColumnBase({
    column,
    tasks,
    onTaskClick,
    onAddTask,
    onEditColumn,
    isBoardDragging = false,
    isTaskDragging = false,
    isColumnDragging = false,
}: SortableColumnProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: `column-${column.id}`,
        data: { type: "column", columnId: column.id },
        disabled: isTaskDragging,
        animateLayoutChanges: () => false,
    });

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition: isBoardDragging ? undefined : transition,
    };
    const dragHandleProps = useMemo(() => ({ ...attributes, ...listeners }), [attributes, listeners]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex-shrink-0",
                isDragging && "opacity-40"
            )}
        >
            <BoardColumn
                id={column.id}
                title={column.name}
                color={column.color}
                column={column}
                tasks={tasks}
                onTaskClick={onTaskClick}
                onAddTask={onAddTask}
                onEditColumn={onEditColumn}
                dragHandleProps={dragHandleProps}
                isDragging={isDragging}
                isColumnDragging={isColumnDragging}
            />
        </div>
    );
}

export const SortableColumn = memo(SortableColumnBase);
