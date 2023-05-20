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
  const [scrolledItems, setScrolledRowsInfo] = useState<{ count: number, offset: number }>({ count: 0, offset: 0 });
  const [visibleItemsCount, setVisibleItemsCount] = useState(initialVisibleRows); // TODO: calculate from viewport size (height)
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
      .slice(0, scrolledItems.count + visibleItemsCount);
  }).get();

  useLayoutEffect(() => {
    const rootElem = parentElemRef.current as HTMLElement;

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

        console.log(`ROW: #${rowIndex}`, { isVisible });
        rowElem.dataset.visible = String(isVisible);

        // free up UI freezing cause of repaint/reflow while reading `rowColumn` dimensions, e.g. `offsetTop`, getBoundingClientRect(), etc.
        window.requestAnimationFrame(
          action(() => {
            rowSize[rowId] = rowColumn.offsetHeight;
            rowElem.style.setProperty(`--grid-row-size`, `${rowSize[rowId]}`);
            rowElem.style.setProperty(`--grid-row-start`, `${allRows.get(rowId).start}`);

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
      threshold: [0, 0.25, 0.5, 0.75, 1],
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
        const scrollTop = rootElem.scrollTop;
        const scrolledRowsInfo = getScrolledRowsInfo([...allRows.values()], scrollTop);

        setScrollTop(scrollTop);
        setScrolledRowsInfo(scrolledRowsInfo);
        rootElem.style.setProperty("--grid-scroll-offset", `${scrolledRowsInfo.offset}px`);
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
  };
}

function getScrolledRowsInfo(rows: VirtualizedRow[], scrollPos: number) {
  let scrolledItemsOffset = 0;
  let scrolledItemsCount = 0;

  // FIXME
  for (const row of rows) {
    if (scrollPos > scrolledItemsOffset + row.size) {
      console.log(`ROW SIZE: #${row.index}`, row.size)
      scrolledItemsOffset += row.size;
      scrolledItemsCount++;
    } else {
      break;
    }
  }

  console.log({
    count: scrolledItemsCount,
    offset: scrolledItemsOffset,
  })

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
