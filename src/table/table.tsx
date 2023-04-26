import styles from "./table.module.css";
import React from "react";
import { observer } from "mobx-react"
import { useVirtualizer } from "@tanstack/react-virtual";
import { TableDataRow, TableRow } from "./table-row";
import type { TableDataColumn } from "./table-column";

export interface TableProps<DataItem = any> {
  className?: string;
  style?: React.CSSProperties;
  header?: React.ReactNode;
  columns?: TableDataColumn<DataItem>[]; // heading columns with names
  rows?: TableDataRow<DataItem>[]; // data rows with inner columns
  paddingStart?: number; // usually it's should be `header.offsetHeight` (works together with `props.header`)
  rowSize?: number; // default: 50px, max expected row's height
  overscan?: number; // default: 10 (extra items for creating as virtual rows within scrollable area viewpoint)
}

export const Table = observer((props: TableProps) => {
  const tableElemRef = React.useRef<HTMLDivElement>(null);
  const {
    className = "",
    style = {},
    paddingStart = 0,
    rowSize = 50,
    overscan = 10,
    header,
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
