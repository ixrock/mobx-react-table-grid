import React, { useEffect, useState, useLayoutEffect } from "react";
import { useLocalObservable } from "mobx-react";
import { TableRow, TableDataRow } from "../table/table-row";

export interface VirtualizationOptions {
  scrollListElemRef: React.RefObject<HTMLElement>;
  rows: VirtualizedRow[];
  approxRowSize?: number;
  initialVisibleRows?: number;
}

export interface VirtualizedRow extends TableDataRow {
  elem: React.ReactElement<HTMLElement>;
  visible?: boolean;
  start?: number;
  size?: number;
}

export interface VirtualizedState {
  scrollTop?: number;
  rows: VirtualizedRow[];
  visibleRows: VirtualizedRow[]; /* visible rows within viewport */
  maxScrollHeight: number; /* max possible `scrollList.scrollHeight` for grid container */
}

export function useVirtualization(options: VirtualizationOptions): VirtualizedState {
  const { scrollListElemRef, initialVisibleRows = 10, rows } = options;

  const [visibleRows, setVisibleRows] = useState<VirtualizedRow[]>(rows.slice(0, initialVisibleRows));
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [maxScrollHeight, setMaxScrollHeight] = useState(0);

  useLayoutEffect(() => {
    const parentElem = scrollListElemRef.current as HTMLElement;
    setScrollTop(parentElem.scrollTop);
    setScrollHeight(parentElem.scrollHeight)
  }, [
    scrollListElemRef.current,
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
        const rowElem = target as HTMLElement;
        // console.log('ROW', { rowElem, isVisible })
        // const rowHeight = rowElem.offsetHeight;
        // rowElem.style.display = isVisible ? "grid" : "none";
      });
    }

    gridRows.forEach(rowElement => scrollObserver.observe(rowElement));

    return () => {
      gridRows.forEach(rowElement => scrollObserver.unobserve(rowElement));
    };
  }, [
    scrollListElemRef.current,
  ]);

  return {
    scrollTop,
    rows,
    visibleRows,
    maxScrollHeight,
  };
}