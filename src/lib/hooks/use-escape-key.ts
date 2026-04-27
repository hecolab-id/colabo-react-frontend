"use client";

import { useEffect, useId, useRef } from "react";

const escapeStack: string[] = [];

function removeFromStack(id: string) {
    const index = escapeStack.lastIndexOf(id);
    if (index !== -1) {
        escapeStack.splice(index, 1);
    }
}

export function useEscapeKey(enabled: boolean, onEscape: () => void) {
    const id = useId();
    const onEscapeRef = useRef(onEscape);

    useEffect(() => {
        onEscapeRef.current = onEscape;
    }, [onEscape]);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        removeFromStack(id);
        escapeStack.push(id);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape" || event.defaultPrevented) {
                return;
            }

            if (escapeStack[escapeStack.length - 1] !== id) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            onEscapeRef.current();
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            removeFromStack(id);
        };
    }, [enabled, id]);
}
