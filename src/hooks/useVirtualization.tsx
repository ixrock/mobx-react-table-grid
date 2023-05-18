import React, { useEffect, useState, useLayoutEffect } from "react";
import type { TableDataRow } from "../table";

export interface VirtualizationOptions {
  scrollListElemRef: React.RefObject<HTMLElement>;
  rowRef: React.RefObject<HTMLElement>;
  rows: TableDataRow[];
  overscanRows?: number;
  initialVisibleRowsCount?: number;
}

export interface VirtualizedRow extends TableDataRow {
  elem?: HTMLElement;
  size?: number;
}

export interface VirtualizedState {
  scrollTop?: number;
  rows: VirtualizedRow[];
  visibleRows: VirtualizedRow[]; /* visible rows within viewport + `opts.overscanRows` */
  maxScrollHeight: number; /* max possible `scrollList.scrollHeight` for grid container */
}

export function useVirtualization(options: VirtualizationOptions): VirtualizedState {
  const { scrollListElemRef, rows, initialVisibleRowsCount = 10 } = options;
  const [visibleRows, setVisibleRows] = useState<VirtualizedRow[]>(rows.slice(0, initialVisibleRowsCount));
  const [scrollTop, setScrollTop] = useState(0);
  const [maxScrollHeight, setMaxScrollHeight] = useState(0);

  useLayoutEffect(() => {
    setScrollTop(scrollListElemRef.current?.scrollTop ?? 0);
  }, [
    scrollListElemRef.current.children,
  ]);

  useEffect(() => {
    const rootElem = scrollListElemRef.current as HTMLElement;
    const gridRows = Array.from(rootElem.children) as HTMLElement[];

    const scrollObserver = new IntersectionObserver(observerCallback, {
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

    gridRows.forEach(rowElement => scrollObserver.observe(rowElement));

    return () => {
      gridRows.forEach(rowElement => scrollObserver.unobserve(rowElement));
    };
  }, [
    scrollListElemRef.current.children,
  ]);

  return {
    scrollTop,
    rows,
    visibleRows,
    maxScrollHeight,
  };
}