import {
    CollisionDetection,
    closestCorners,
    pointerWithin,
} from "@dnd-kit/core";

/**
 * Custom collision detection strategy that keeps columns snappable 
 * even when the cursor is far above/below the container (1D horizontal sorting).
 */
export const customCollisionDetection: CollisionDetection = (args) => {
    const { active, droppableContainers, collisionRect, droppableRects } = args;

    // Check if we are dragging a column
    if (String(active.id).startsWith("column-")) {
        // Filter out non-column containers (like tasks or other zones)
        const columnContainers = droppableContainers.filter((container) =>
            String(container.id).startsWith("column-")
        );

        // Find the closest column based ONLY on the X axis diff
        let closestContainer = null;
        let minDistance = Infinity;

        const activeCenter = collisionRect.left + collisionRect.width / 2;

        for (const container of columnContainers) {
            const rect = droppableRects.get(container.id);
            if (!rect) continue;

            const containerCenter = rect.left + rect.width / 2;
            const dist = Math.abs(activeCenter - containerCenter);

            if (dist < minDistance) {
                minDistance = dist;
                closestContainer = container;
            }
        }

        if (closestContainer) {
            return [{ id: closestContainer.id, value: 1 }]; // Value doesn't strictly matter for closest
        }
        return [];
    }

    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
        return pointerCollisions;
    }

    return closestCorners(args);
};
