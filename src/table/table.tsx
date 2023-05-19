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
  classes?: TableClassNames;
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
   * @default: 40
   */
  rowSize?: number;
  /**
   * Extra items for creating as virtual rows within scrollable area of viewpoint (table)
   * @default: 10
   * @dependencies of `@tanstack/react-virtual`
   */
  overscan?: number;
  /**
   * Allows to have different sizes (heights) for rows, calculated from row-element when it's visible.
   * Otherwise, `props.rowSize` would be used as fixed height for `virtualRow.size`
   * @default false
   */
  dynamicRowSize?: boolean;
  /**
   * Allows to add custom static rows or some other contents (e.g. "+" button with `position: absolute`)
   */
  children?: React.ReactNode;
}

export interface TableClassNames {
  headerClass?: string;
  theadClass?: string;
  theadTitleClass?: string;
  rowBaseClass?: string;
  columnBaseClass?: string;
  resizableColumn?: string;
  sortableColumn?: string;
  draggableColumn?: string;
  draggableColumnActive?: string;
  draggableIcon?: string;
  droppableColumn?: string;
  droppableColumnActive?: string;
  selectableRow?: string;
  selectedRow?: string;
  sortingArrow?: string;
  sortingArrowAsc?: string;
  sortingArrowDesc?: string;
}

export const Table = observer((props: TableProps) => {
  const tableElemRef = React.useRef<HTMLDivElement>(null);
  const {
    style = {},
    classes = {},
    paddingStart = 0,
    rowSize = 40,
    overscan = 10,
    dynamicRowSize = false,
    header = null,
    rows = [],
    columns = [],
    children,
  } = props;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableElemRef.current,
    getItemKey: (index: number) => String(rows[index].id ?? index),
    estimateSize: (index: number) => rowSize,
    paddingStart: rowSize + paddingStart,
    overscan: overscan,
    measureElement: (elem: HTMLElement) => elem?.scrollHeight ?? rowSize,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const maxScrollHeight = virtualRows.length ? virtualizer.getTotalSize() : 0;

  const cssVars = {
    ...style,
    [`--grid-cols`]: makeCssGridTemplate(columns),
    [`--grid-virtual-max-height`]: `${maxScrollHeight}px`,
  } as React.CSSProperties;

  const className: string = [
    styles.table,
    props.className,
  ].filter(Boolean).join(" ");

  return (
    <DndProvider backend={HTML5Backend}>
      <div id={props.id} className={className} style={cssVars} ref={tableElemRef}>
        {header && (
          <TableRow
            id={tableHeaderRowId}
            className={`${styles.header} ${classes.headerClass ?? ""}`}
            columns={[{ id: "header", title: header }]}
            classes={classes}
            data={null}
          />
        )}
        <TableRow
          id={tableTheadRowId}
          className={`${styles.thead} ${classes.theadClass ?? ""}`}
          columns={columns}
          classes={classes}
          data={null}
        />
        {virtualRows.map(virtualRow => {
          const row = rows[virtualRow.index];
          return (
            <TableRow
              {...row}
              classes={classes}
              key={virtualRow.key}
              id={virtualRow.key}
              index={virtualRow.index}
              className={`${row.className ?? ""} ${dynamicRowSize ? styles.dynamicSize : ""}`}
              elemRef={dynamicRowSize ? virtualizer.measureElement : undefined}
              style={{
                ...row.style,
                position: "absolute",
                transform: `translateY(${virtualRow.start}px)`,
                height: virtualRow.size,
                width: "100%",
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
