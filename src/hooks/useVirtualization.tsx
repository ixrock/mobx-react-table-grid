import React, { useEffect, useState } from "react";
import type { TableDataRow } from "../table/table-row";

export interface VirtualizationOptions {
  scrollableElemRef: React.RefObject<HTMLElement>;
  rows: TableDataRow[];
  approxRowHeight?: number; // in pixels
}

export interface VirtualizedRow {
  index: number;
  height: number
  elem: HTMLElement;
  row: TableDataRow;
}

// TODO: get rid of `@tanstack/react-virtual` and better support css-grid (without wrapping each <TableRow/> into own div)
export function useVirtualization(options: VirtualizationOptions): VirtualizedRow[] {
  const {scrollableElemRef,/* approxRowHeight = 50, rows*/} = options;
  const [visibleRows/*, setVisibleRows*/] = useState<VirtualizedRow[]>([]);

  useEffect(() => {
    const rootElem = scrollableElemRef.current as HTMLElement;
    const gridRows = Array.from(rootElem.children) as HTMLElement[];

    const tableScrollObserver = new IntersectionObserver(observerCallback, {
      root: rootElem,
      rootMargin: "50% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });

    function observerCallback(entries: IntersectionObserverEntry[], observer: IntersectionObserver) {
      entries.forEach(({ target, isIntersecting: isVisible }) => {
        // const rowElem = target as HTMLElement;
        // const rowHeight = rowElem.offsetHeight;
        // rowElem.style.display = isVisible ? "grid" : "none";
      });
    }

    gridRows.forEach(rowElement => tableScrollObserver.observe(rowElement));

    return () => {
      gridRows.forEach(rowElement => tableScrollObserver.unobserve(rowElement));
    };
  }, [
    scrollableElemRef.current,
  ]);

  return visibleRows;
}