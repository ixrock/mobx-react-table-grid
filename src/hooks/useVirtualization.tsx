import React, { useEffect, useLayoutEffect, useState } from "react";
import { computed, IComputedValue } from "mobx";
import { useLocalObservable } from "mobx-react";
import type { TableDataRow, TableRowId } from "../table";

export interface VirtualizationOptions<DataItem = any> {
  parentElemRef: React.RefObject<HTMLElement>;
  rows: TableDataRow[];
  /**
   * Default size for undiscovered rows (not yet visible within viewport while scrolling)
   * @default 40
   */
  approxRowSize?: number;
  /**
   * Initial amount of visible rows for gathering dimensions
   * @default 25
   */
  initialVisibleRows?: number;
}

export interface VirtualizedRow<DataItem = any> extends TableDataRow<DataItem> {
  start?: number; // px
  size?: number; // px
}

export interface VirtualizedState {
  scrollTop?: number;
  rowsMap: IComputedValue<Map<TableRowId, VirtualizedRow>>;
  virtualRows: IComputedValue<VirtualizedRow[]>; /* visible within or near viewport */
  maxScrollHeight: number; /* max possible `parentGridElem.scrollHeight` */
}

export function useVirtualization<D>(options: VirtualizationOptions<D>): VirtualizedState {
  const {
    parentElemRef, rows,
    initialVisibleRows = 25,
    approxRowSize = 40,
  } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [maxScrollHeight, setMaxScrollHeight] = useState(rows.length * approxRowSize);

  const rowStart = useLocalObservable<Record<TableRowId, number>>(() => ({}));
  const rowSize = useLocalObservable<Record<TableRowId, number>>(() => ({}));

  const rowVisibility = useLocalObservable<Record<TableRowId, boolean>>(() => {
    const state: Record<TableRowId, boolean> = {};
    return rows
      .slice(0, initialVisibleRows)
      .reduce((state, row) => {
        state[row.id] = true;
        return state;
      }, state)
  });

  const allRows: IComputedValue<Map<TableRowId, VirtualizedRow>> = computed(() => {
    return new Map(
      rows.map((row, index) => ([
        row.id,
        {
          ...row,
          start: rowStart[row.id] + (approxRowSize * index),
          size: rowSize[row.id] ?? approxRowSize,
        } as VirtualizedRow
      ]))
    );
  });

  const visibleRows: IComputedValue<VirtualizedRow[]> = computed(() => {
    const rows = allRows.get();
    return Object.entries(rowVisibility)
      .filter(([rowId, isVisible]) => isVisible)
      .map(([rowId, isVisible]) => rows.get(rowId));
  });

  useLayoutEffect(() => {
    const parentElem = parentElemRef.current as HTMLElement;
    setScrollTop(parentElem.scrollTop);
    setScrollHeight(parentElem.scrollHeight)
  }, [
    parentElemRef.current,
  ]);

  useEffect(() => {
    const rootElem = parentElemRef.current as HTMLElement;
    const gridRows = Array.from(rootElem.children) as HTMLElement[];

    const scrollObserver = new IntersectionObserver(observerCallback, {
      root: rootElem,
      rootMargin: "50% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });

    function observerCallback(entries: IntersectionObserverEntry[], observer: IntersectionObserver) {
      entries.forEach(({ target, isIntersecting: isVisible }) => {
        const rowElem = target as HTMLElement;
        console.log('ROW', { rowElem, isVisible })
      });
    }

    gridRows.forEach(elem => scrollObserver.observe(elem));

    return () => {
      gridRows.forEach(elem => scrollObserver.unobserve(elem));
    };
  }, [
    parentElemRef.current,
  ]);

  return {
    rowsMap: allRows,
    virtualRows: visibleRows,
    scrollTop,
    maxScrollHeight,
  };
}