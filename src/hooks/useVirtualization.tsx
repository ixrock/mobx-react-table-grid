import React, { useLayoutEffect, useState } from "react";
import { action, computed } from "mobx";
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
   * Initial amount of visible virtual rows for rendering.
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
  rowsMap: Map<TableRowId, VirtualizedRow>;
  virtualRows: VirtualizedRow[]; /* visible within or near viewport */
  maxScrollHeight: number; /* max possible `parentGridElem.scrollHeight` */
}

export function useVirtualization<D>(options: VirtualizationOptions<D>): VirtualizedState {
  const {
    parentElemRef,
    rows,
    initialVisibleRows = 25,
    approxRowSize = 40,
  } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const [maxScrollHeight, setMaxScrollHeight] = useState(rows.length * approxRowSize);
  const [scrolledItemsCount, setScrolledRowsCount] = useState(0);

  // TODO: must correlate with viewport size (height)
  const [visibleItemsCount, setVisibleItemsCount] = useState(initialVisibleRows);
  const [viewportSize, setViewportSize] = useState(0);

  const rowSize = useLocalObservable<Record<TableRowId, number>>(() => ({}));

  const allRows: Map<TableRowId, VirtualizedRow> = computed(() => {
    return new Map(
      rows.map((row, index) => ([
        row.id,
        {
          ...row,
          get start() {
            return Array.from(allRows.values())
              .slice(0, index)
              .map(row => row.size)
              .reduce((total, size) => total + size, 0);
          },
          get size() {
            return rowSize[row.id] ?? approxRowSize;
          },
        } as VirtualizedRow
      ]))
    );
  }).get();

  // FIXME: get proper items count correlated with `parentElem.scrollTop`
  const visibleRows: VirtualizedRow[] = computed(() => {
    return Array
      .from(allRows.values())
      .slice(scrolledItemsCount, scrolledItemsCount + visibleItemsCount);
  }).get();

  const onScroll = () => {
    window.requestAnimationFrame(() => {
      const scrollTop = parentElemRef.current?.scrollTop ?? 0;
      setScrollTop(scrollTop);
      setScrolledRowsCount(getScrolledVirtualRowsCount(allRows, scrollTop));
    });
  };

  useLayoutEffect(() => {
    const rootElem = parentElemRef.current as HTMLElement;

    // FIXME: figure out how to observe new rendered items after scrolling
    const observingRowElement = Array
      .from(rootElem.childNodes)
      .map(row => row.firstChild) as HTMLElement[];

    // TODO: update on window/element resize
    setViewportSize(rootElem.scrollHeight);

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
        const rowIndex = rowElem.dataset.index;
        if (!rowId) return; // skip: for `header`, `thead` and other possible custom rows

        console.log(`ROW: #${rowIndex}`, { isVisible });
        rowElem.dataset.visible = String(isVisible);

        // free up UI freezing cause of repaint (or maybe reflow?)
        window.requestAnimationFrame(
          action(() => {
            rowSize[rowId] = rowColumn.offsetHeight;
            rowElem.style.setProperty(`--grid-row-size`, `${rowSize[rowId]}px`);
            rowElem.style.setProperty(`--grid-row-start`, `${allRows.get(rowId).start}px`);

            const maxScrollHeight = rows
              .map(row => rowSize[row.id] ?? approxRowSize)
              .reduce((total, size) => total + size, 0);

            setMaxScrollHeight(maxScrollHeight);
          })
        );
      }));
    }

    rootElem.addEventListener("scroll", onScroll);
    observingRowElement.forEach(elem => observer.observe(elem));

    return () => {
      rootElem.removeEventListener("scroll", onScroll);
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

function getScrolledVirtualRowsCount(rowsMap: Map<TableRowId, VirtualizedRow>, scrollPos: number) {
  if (!scrollPos) return 0;

  const rows = Array.from(rowsMap.values());
  let scrolledItemsOffset = 0;
  let scrolledItemsCount = 0;

  for (const row of rows) {
    scrolledItemsOffset += row.size;
    if (scrollPos > scrolledItemsOffset) {
      scrolledItemsCount++;
    } else {
      break;
    }
  }

  return scrolledItemsCount;
}

function measurePerformance(callback: () => void) {
  const startTime = performance.now();
  callback();
  const operationTimeMs = performance.now() - startTime;
  console.log(`[PERFORMANCE]: ${operationTimeMs}ms`)
}
