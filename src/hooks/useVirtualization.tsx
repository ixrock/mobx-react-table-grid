import React, { useEffect, useLayoutEffect, useState } from "react";
import { action, computed, observable } from "mobx";
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
  /**
   * Add extra amount of visible virtual rows out of viewport size
   * @default 10
   */
  overscan?: number;
}

export interface VirtualizedRow<DataItem = any> extends TableDataRow<DataItem> {
  size?: number; // px
}

export interface VirtualizedState {
  scrollTop?: number;
  rowsMap: Map<TableRowId, VirtualizedRow>;
  virtualRows: VirtualizedRow[]; /* visible within or near viewport */
  maxScrollHeight: number; /* max possible `parentGridElem.scrollHeight` */
}

export function useVirtualization<D>(options: VirtualizationOptions<D>): VirtualizedState {
  const {
    parentElemRef,
    rows,
    initialVisibleRows = 15,
    approxRowSize = 40,
    overscan = 10,
  } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const [maxScrollHeight, setMaxScrollHeight] = useState(rows.length * approxRowSize);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [visibleItemsCount, setVisibleItemsCount] = useState(initialVisibleRows + overscan); // TODO: update on window/viewport resize

  const rowSize = useLocalObservable<Record<TableRowId, number>>(() => ({}));
  const rowVisibility = observable(
    rows.slice(0, visibleItemsCount).reduce((state, row) => {
      state[row.id] = true;
      return state;
    }, {} as Record<TableRowId, boolean>)
  );

  const allRows: Map<TableRowId, VirtualizedRow> = computed(() => {
    return new Map(
      rows.map((row, index) => ([
        row.id,
        {
          ...row,
          get size(){
            return rowSize[row.id] ?? approxRowSize;
          },
        } as VirtualizedRow
      ]))
    );
  }).get();

  const visibleRows: VirtualizedRow[] = computed(() => {
    return Object.entries(rowVisibility)
      .filter(([rowId, isVisible]) => isVisible)
      .map(([rowId, isVisible]) => allRows.get(rowId));
  }).get();

  useLayoutEffect(() => {
    const rootElem = parentElemRef.current as HTMLElement;
    setScrollTop(rootElem.scrollTop);
    setScrollHeight(rootElem.scrollHeight)

    const observingRowElement = Array.from(rootElem.childNodes).map(row => row.firstChild) as HTMLElement[];

    const observer = new IntersectionObserver(observerCallback, {
      root: rootElem,
      rootMargin: "50% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });

    function observerCallback(entries: IntersectionObserverEntry[], observer: IntersectionObserver) {
      entries.forEach(action(({ target, isIntersecting: isVisible }) => {
        const rowColumn = target as HTMLElement;
        const rowElem = rowColumn.parentElement;
        const rowId = rowElem.dataset.id;
        if (!rowId) return; // skip: for `header`, `thead` and other possible custom rows

        rowVisibility[rowId] = isVisible;
        rowElem.dataset.visible = String(isVisible);

        // free up UI freezing cause of repaint (or maybe reflow?)
        window.requestAnimationFrame(
          action(() => {
            rowSize[rowId] = rowColumn.scrollHeight;
            rowElem.dataset.size = String(rowSize[rowId]);

            const maxScrollHeight = rows
              .map(row => rowSize[row.id] ?? approxRowSize)
              .reduce((total, size) => total + size, 0);

            setMaxScrollHeight(maxScrollHeight);
          })
        );
      }));
    }

    observingRowElement.forEach(elem => observer.observe(elem));

    return () => {
      observingRowElement.forEach(elem => observer.unobserve(elem));
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