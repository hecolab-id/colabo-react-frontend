"use client";

import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

type VirtualWindowOptions = {
    count: number;
    estimateSize: number | ((index: number) => number);
    overscan?: number;
};

export function useVirtualWindow<TElement extends HTMLElement>({
    count,
    estimateSize,
    overscan = 4,
}: VirtualWindowOptions): {
    containerRef: RefObject<TElement | null>;
    startIndex: number;
    endIndex: number;
    totalSize: number;
    getOffset: (index: number) => number;
    setSize: (index: number, size: number) => void;
} {
    const containerRef = useRef<TElement | null>(null);
    const [viewport, setViewport] = useState({ scrollTop: 0, height: 0 });
    const [measuredSizes, setMeasuredSizes] = useState<Record<number, number>>({});

    const sizes = useMemo(() => {
        return Array.from({ length: count }, (_, index) => (
            measuredSizes[index] || (typeof estimateSize === "function" ? estimateSize(index) : estimateSize)
        ));
    }, [count, estimateSize, measuredSizes]);

    const offsets = useMemo(() => {
        const nextOffsets = new Array<number>(count);
        let currentOffset = 0;

        for (let index = 0; index < count; index += 1) {
            nextOffsets[index] = currentOffset;
            currentOffset += sizes[index] || 0;
        }

        return { offsets: nextOffsets, totalSize: currentOffset };
    }, [count, sizes]);

    const measure = useCallback(() => {
        const element = containerRef.current;
        if (!element) {
            return;
        }

        setViewport({
            scrollTop: element.scrollTop,
            height: element.clientHeight,
        });
    }, []);

    useEffect(() => {
        measure();

        const element = containerRef.current;
        if (!element) {
            return;
        }

        element.addEventListener("scroll", measure, { passive: true });

        const resizeObserver = typeof ResizeObserver !== "undefined"
            ? new ResizeObserver(measure)
            : null;
        resizeObserver?.observe(element);

        return () => {
            element.removeEventListener("scroll", measure);
            resizeObserver?.disconnect();
        };
    }, [measure]);

    const { startIndex, endIndex } = useMemo(() => {
        if (count === 0) {
            return { startIndex: 0, endIndex: -1 };
        }

        const viewportStart = Math.max(0, viewport.scrollTop);
        const viewportEnd = viewportStart + Math.max(viewport.height, 1);
        let nextStart = 0;
        let nextEnd = count - 1;

        for (let index = 0; index < count; index += 1) {
            const itemEnd = offsets.offsets[index] + (sizes[index] || 0);
            if (itemEnd >= viewportStart) {
                nextStart = Math.max(0, index - overscan);
                break;
            }
        }

        for (let index = nextStart; index < count; index += 1) {
            const itemStart = offsets.offsets[index];
            if (itemStart > viewportEnd) {
                nextEnd = Math.min(count - 1, index + overscan);
                break;
            }
        }

        return { startIndex: nextStart, endIndex: nextEnd };
    }, [count, offsets.offsets, overscan, sizes, viewport.height, viewport.scrollTop]);

    const getOffset = useCallback((index: number) => offsets.offsets[index] || 0, [offsets.offsets]);
    const setSize = useCallback((index: number, size: number) => {
        const nextSize = Math.max(0, Math.ceil(size));

        setMeasuredSizes((current) => {
            if (current[index] === nextSize) {
                return current;
            }

            return {
                ...current,
                [index]: nextSize,
            };
        });
    }, []);

    return {
        containerRef,
        startIndex,
        endIndex,
        totalSize: offsets.totalSize,
        getOffset,
        setSize,
    };
}
