import React, { useLayoutEffect, useState } from "react";
import { computed } from "mobx";
import type { TableDataRow } from "../table";
import throttle from "lodash/throttle";

export interface VirtualizationOptions<DataItem = any> {
  parentElemRef: React.RefObject<HTMLElement>;
  rows: TableDataRow[];
  /**
   * Grid row size
   * @default 50
   */
  rowSize: number;
  /**
   * Extra visible items count, besides calculated from viewport size
   * @default 10
   */
  overscan?: number;
}

export interface VirtualizedRow<DataItem = any> extends TableDataRow<DataItem> {
  size?: number; // px
}

export type VirtualizedState = ReturnType<typeof useVirtualization>;

export function useVirtualization<D>(options: VirtualizationOptions<D>) {
  const {
    parentElemRef,
    rows,
    rowSize = 50,
    overscan = 10,
  } = options;

  const [scrollPos, setScrollPos] = useState(0);
  const [maxScrollHeight, setMaxScrollHeight] = useState(0);
  const [scrolledRowsCount, setScrolledRowsCount] = useState(0);
  const [viewportSize, setViewportSize] = useState(0);
  const [visibleRowsCount, setVisibleRowsCount] = useState(1);

  const virtualRows: VirtualizedRow[] = computed(() => {
    return rows.slice(scrolledRowsCount, scrolledRowsCount + visibleRowsCount);
  }).get();

  useLayoutEffect(() => {
    const rootElem = parentElemRef.current as HTMLElement;

    setMaxScrollHeight(rows.length * rowSize);
    setViewportSize(rootElem.offsetHeight);

    const onScroll = throttle(() => {
      window.requestIdleCallback(() => {
        const { scrollTop } = rootElem;
        const scrolledRowsInfo = getScrolledRowsInfo({
          rows,
          scrollPos: scrollTop,
          rowSize: rowSize,
        });
        setScrollPos(scrollTop);
        setScrolledRowsCount(scrolledRowsInfo.count);
      });
    }, 50);

    const resizeObserver = new ResizeObserver(([entry]) => {
      const viewportSize = Math.round(entry.contentRect.height);
      setViewportSize(viewportSize);

      const viewportRowsInfo = getScrolledRowsInfo({
        rows: rows.slice(scrolledRowsCount),
        scrollPos: viewportSize,
        rowSize: rowSize,
      });

      setVisibleRowsCount(viewportRowsInfo.count + overscan);
    });

    rootElem.addEventListener("scroll", onScroll);
    resizeObserver.observe(rootElem);

    return () => {
      resizeObserver.disconnect();
      rootElem.removeEventListener("scroll", onScroll);
    }
  }, [
    rows,
    parentElemRef,
  ]);

  return {
    virtualRows,
    scrollPos,
    maxScrollHeight,
    viewportSize,
    visibleRowsCount,
    scrolledRowsCount,
  };
}

// --Utils--

function getScrolledRowsInfo(opts: { rows: VirtualizedRow[], scrollPos: number, rowSize?: number }) {
  const { rows, scrollPos } = opts;
  let scrolledItemsOffset = 0;
  let scrolledItemsCount = 0;

  for (const row of rows) {
    const rowSize = opts.rowSize ?? row.size;
    if (scrollPos > scrolledItemsOffset + rowSize) {
      scrolledItemsOffset += rowSize;
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

// TODO: experiment with rows auto-sizing
//
// useLayoutEffect(() => {
//   const rootElem = parentElemRef.current as HTMLElement;
//
//   const observingRows = Array
//     .from(rootElem.childNodes)
//     .map(row => row.firstChild) as HTMLElement[];
//
//   const visibilityObserver = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
//     entries.forEach(action(({ target, isIntersecting: isVisible }) => {
//       const rowColumn = target as HTMLElement;
//       const rowElem = rowColumn.parentElement;
//       const rowId = rowElem.dataset.id;
//       const rowIndex = rowElem.dataset.index;
//       if (!rowId) return; // skip: for `header`, `thead` and other possible custom rows
//
//       console.log(`ROW: #${rowIndex}, visible: ${isVisible}`);
//       rowElem.dataset.visible = String(isVisible);
//
//       // free up UI freezing cause of repaint/reflow while reading dom-element dimensions, e.g. `offsetTop`, `scrollHeight`, etc.
//       window.requestAnimationFrame(
//         action(() => {
//           if (rowSize[rowId] === undefined) {
//             rowSize[rowId] = rowColumn.offsetHeight;
//           }
//
//           const maxScrollHeight = rows
//             .map(row => rowSize[row.id] ?? approxRowSize)
//             .reduce((total, size) => total + size, 0);
//
//           setMaxScrollHeight(maxScrollHeight);
//         })
//       );
//     }));
//   }, {
//     root: rootElem,
//     rootMargin: "50% 0px",
//     threshold: [0, 0.5, 1],
//   });
//
//   const domObserver = new MutationObserver((mutationList) => {
//     for (const mutation of mutationList) {
//       if (mutation.type === "childList") {
//         mutation.addedNodes.forEach((elem: HTMLElement) => visibilityObserver.observe(elem));
//         mutation.removedNodes.forEach((elem: HTMLElement) => visibilityObserver.unobserve(elem));
//       }
//     }
//   });
//
//   domObserver.observe(rootElem, { childList: true });
//   observingRows.forEach(elem => visibilityObserver.observe(elem));
//
//   return () => {
//     observingRows.forEach(elem => visibilityObserver.unobserve(elem));
//     domObserver.disconnect();
//   };
// }, [
//   parentElemRef.current,
// ]);
