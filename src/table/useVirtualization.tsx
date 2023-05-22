import React, { useLayoutEffect, useState } from "react";
import type { TableDataRow } from "./index";
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
  /**
   * Allows to turn off virtualization
   */
  enabled?: boolean;
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
    enabled = true,
  } = options;

  const [scrollPos, setScrollPos] = useState(0);
  const [maxScrollHeight, setMaxScrollHeight] = useState(0);
  const [scrolledRowsCount, setScrolledRowsCount] = useState(0);
  const [viewportSize, setViewportSize] = useState(0);
  const [visibleRowsCount, setVisibleRowsCount] = useState(1);

  const virtualRows: VirtualizedRow[] = enabled
    ? rows.slice(scrolledRowsCount, scrolledRowsCount + visibleRowsCount)
    : rows;

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
