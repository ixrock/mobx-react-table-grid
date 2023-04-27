import styles from "./table.module.css";
import React from "react";
import { observer } from "mobx-react"
import { useVirtualizer } from "@tanstack/react-virtual";
import { TableDataRow, TableRow } from "./table-row";
import type { TableDataColumn } from "./table-column";

export interface TableProps<DataItem = any> {
  className?: string;
  style?: React.CSSProperties;
  /**
   * Table's header html block.
   * Scrolled with table items behind heading columns.
   */
  header?: React.ReactNode;
  /**
   * Heading columns definition within the grid (aka <thead>-s but in data-terms).
   * This outputs floating html block that stays always on the top of scrolled items list (`position: sticky`)
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
  } = props;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableElemRef.current,
    getItemKey: (index: number) => rows[index].id ?? index,
    estimateSize: (index: number) => rowSize,
    paddingStart: rowSize + paddingStart,
    overscan: overscan,
  });

  const cssVars = {
    ...style,
    [`--grid-cols`]: columns.map(column => `var(--grid-col-size-${column.id}, var(--grid-col-size))`).join(" "),
    [`--grid-virtual-max-height`]: `${rowVirtualizer.getTotalSize()}px`,
  } as React.CSSProperties;

  return (
    <div className={`${styles.table} ${className}`} style={cssVars} ref={tableElemRef}>
      {header && (
        <TableRow id="header" className={styles.header} title={header} data={null}/>
      )}
      <TableRow
        id="thead"
        className={styles.thead}
        columns={columns}
        data={null}
      />
      {rowVirtualizer.getVirtualItems().map(virtualRow => {
        const row = rows[virtualRow.index];
        return (
          <TableRow
            key={virtualRow.key}
            id={virtualRow.key}
            index={virtualRow.index}
            className={`${styles.row} ${row.className ?? ""}`}
            data={row.data}
            columns={row.columns}
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
    </div>
  )
});
