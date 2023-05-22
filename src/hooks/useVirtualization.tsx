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

export type VirtualizedState = ReturnType<typeof useVirtualization>;

export function useVirtualization<D>(options: VirtualizationOptions<D>) {
  const {
    parentElemRef,
    rows,
    initialVisibleRows = 25,
    approxRowSize = 40,
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [maxScrollHeight, setMaxScrollHeight] = useState(rows.length * approxRowSize);
  const [hiddenScrolledRowsCount, setScrolledRowCount] = useState(0);
  const [visibleRowsCount, setVisibleRowsCount] = useState(initialVisibleRows); // TODO: calculate from viewport size (height)
  const [viewportHeight, setViewportHeight] = useState(0);

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

  const visibleRows: VirtualizedRow[] = computed(() => {
    return Array
      .from(allRows.values())
      .slice(hiddenScrolledRowsCount, hiddenScrolledRowsCount + visibleRowsCount);
  }).get();

  useLayoutEffect(() => {
    const rootElem = parentElemRef.current as HTMLElement;
    setViewportHeight(rootElem.offsetHeight);

    const observingRows = Array
      .from(rootElem.childNodes)
      .map(row => row.firstChild) as HTMLElement[];

    const visibilityObserver = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
      entries.forEach(action(({ target, isIntersecting: isVisible }) => {
        const rowColumn = target as HTMLElement;
        const rowElem = rowColumn.parentElement;
        const rowId = rowElem.dataset.id;
        const rowIndex = rowElem.dataset.index;
        if (!rowId) return; // skip: for `header`, `thead` and other possible custom rows

        console.log(`ROW: #${rowIndex}, visible: ${isVisible}`);
        rowElem.dataset.visible = String(isVisible);

        // free up UI freezing cause of repaint/reflow while reading dom-element dimensions, e.g. `offsetTop`, `scrollHeight`, etc.
        window.requestAnimationFrame(
          action(() => {
            // TODO: reset on resize viewport dimensions change
            if(rowSize[rowId] === undefined) {
              rowSize[rowId] = rowColumn.offsetHeight;
            }

            const maxScrollHeight = rows
              .map(row => rowSize[row.id] ?? approxRowSize)
              .reduce((total, size) => total + size, 0);

            setMaxScrollHeight(maxScrollHeight);
          })
        );
      }));
    }, {
      root: rootElem,
      rootMargin: "50% 0px",
      threshold: [0, 0.5, 1],
    });

    // FIXME: visibility observer callback don't called when `addedNodes` > 0
    const domObserver = new MutationObserver((mutationList) => {
      for (const mutation of mutationList) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((elem: HTMLElement) => visibilityObserver.observe(elem));
          mutation.removedNodes.forEach((elem: HTMLElement) => visibilityObserver.unobserve(elem));
        }
      }
    });

    const onScroll = () => {
      window.requestAnimationFrame(() => {
        const { scrollTop, offsetHeight } = rootElem;
        const rows = Array.from(allRows.values());
        const scrolledRowsInfo = getScrolledRowsInfo(rows, scrollTop);
        // const viewportRowsInfo = getScrolledRowsInfo(rows.slice(scrolledRowsInfo.count), offsetHeight);

        setScrollTop(scrollTop);
        setScrolledRowCount(scrolledRowsInfo.count);
        // setViewportHeight(offsetHeight)
      });
    };

    rootElem.addEventListener("scroll", onScroll);
    domObserver.observe(rootElem, { childList: true });
    observingRows.forEach(elem => visibilityObserver.observe(elem));

    return () => {
      rootElem.removeEventListener("scroll", onScroll);
      observingRows.forEach(elem => visibilityObserver.unobserve(elem));
      domObserver.disconnect();
    };
  }, [
    parentElemRef.current,
  ]);

  return {
    rowsMap: allRows,
    virtualRows: visibleRows,
    scrollTop,
    maxScrollHeight,
    viewportHeight,
    visibleRowsCount,
    hiddenScrolledRowsCount,
  };
}


// --Utils--

function getScrolledRowsInfo(rows: VirtualizedRow[], scrollPos: number) {
  let scrolledItemsOffset = 0;
  let scrolledItemsCount = 0;

  for (const row of rows) {
    if (scrollPos > scrolledItemsOffset + row.size) {
      scrolledItemsOffset += row.size;
      scrolledItemsCount++;
    } else {
      break;
    }
  }

  return {
    count: scrolledItemsCount,
    offset: scrolledItemsOffset,
  };
}

function measurePerformance(callback: () => void) {
  const startTime = performance.now();
  callback();
  const operationTimeMs = performance.now() - startTime;
  console.log(`[PERFORMANCE]: ${operationTimeMs}ms`)
}
