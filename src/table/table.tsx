import styles from "./table.module.scss";
import React from "react";
import { observer } from "mobx-react"
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TableDataRow, TableRow } from "./table-row";
import type { TableDataColumn } from "./table-column";
import { tableHeaderRowId, tableTheadRowId } from "./table-constants";

export interface TableProps<DataItem = any> {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Table's header html block.
   * Scrolled with table items behind heading columns.
   */
  header?: React.ReactNode;
  /**
   * Heading columns definition within the grid (aka <thead>-s but in data-terms).
   * This field produce floating html block that stays always on the top (sticky) of parent scrollable list.
   */
  columns: TableDataColumn<DataItem>[];
  /**
   * Data rows with required columns.
   * All the columns inside extended from "heading" `props.columns` and has all the `data-getters`
   * and callbacks required for specific columns to handle the data item (e.g. sort, display, etc)
   * Usually `props.rows` needs to be generated with some items list and used above `props.columns`
   */
  rows: TableDataRow<DataItem>[];
  /**
   * Usually it's should be the same as `props.header.offsetHeight` (when provided)
   * @dependencies of `@tanstack/react-virtual`
   */
  paddingStart?: number;
  /**
   * Max expected row's height. Currently, all rows has that fixed size.
   * @dependencies of `@tanstack/react-virtual`
   * @default: 50
   */
  rowSize?: number;
  /**
   * Extra items for creating as virtual rows within scrollable area of viewpoint (table)
   * @default: 10
   * @dependencies of `@tanstack/react-virtual`
   */
  overscan?: number;
  /**
   * Allows to add custom static rows or some other contents (e.g. "+" button with `position: absolute`)
   */
  children?: React.ReactNode;
}

export const Table = observer((props: TableProps) => {
  const tableElemRef = React.useRef<HTMLDivElement>(null);
  const {
    className = "",
    style = {},
    paddingStart = 0,
    rowSize = 50,
    overscan = 10,
    header = null,
    rows = [],
    columns = [],
    children,
  } = props;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableElemRef.current,
    getItemKey: (index: number) => String(rows[index].id ?? index),
    estimateSize: (index: number) => rowSize,
    paddingStart: rowSize + paddingStart,
    overscan: overscan,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const maxScrollHeight = virtualRows.length ? rowVirtualizer.getTotalSize() : 0;

  const cssVars = {
    ...style,
    [`--grid-cols`]: makeCssGridTemplate(columns),
    [`--grid-virtual-max-height`]: `${maxScrollHeight}px`,
  } as React.CSSProperties;

  return (
    <DndProvider backend={HTML5Backend}>
      <div id={props.id} className={`${styles.table} ${className}`} style={cssVars} ref={tableElemRef}>
        {header && (
          <TableRow
            id={tableHeaderRowId}
            className={styles.header}
            columns={[{ id: "header", title: header }]}
            data={null}
          />
        )}
        <TableRow
          id={tableTheadRowId}
          className={styles.thead}
          columns={columns}
          data={null}
        />
        {virtualRows.map(virtualRow => {
          const row = rows[virtualRow.index];
          return (
            <TableRow
              {...row}
              key={virtualRow.key}
              id={virtualRow.key}
              index={virtualRow.index}
              className={`${styles.row} ${row.className ?? ""}`}
              style={{
                ...row.style,
                position: "absolute",
                top: virtualRow.start,
                height: virtualRow.size,
                width: "100%",
                overflow: "hidden"
              }}
            />
          );
        })}
        {children}
      </div>
    </DndProvider>
  )
});

export function makeCssGridTemplate(columns: TableDataColumn[]): string {
  return columns
    .map(({ id, size }) => `[${id}] var(--grid-col-size-${id}, ${size ?? "var(--grid-col-size)"})`)
    .join(" ")
}
