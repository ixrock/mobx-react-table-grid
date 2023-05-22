import styles from "./table.module.scss";
import React from "react";
import { observer } from "mobx-react"
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TableDataRow, TableRow } from "./table-row";
import type { TableDataColumn } from "./table-column";
import { tableHeaderRowId, tableTheadRowId } from "./table-constants";
import { useVirtualization } from "../hooks/useVirtualization";

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
    header = null,
    rows = [],
    columns = [],
    children,
  } = props;

  const { maxScrollHeight, virtualRows, scrollTop, hiddenScrolledRowsCount } = useVirtualization({
    parentElemRef: tableElemRef,
    rows: rows,
  });

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
      <p>Rows hidden: {hiddenScrolledRowsCount}</p>
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
        {virtualRows.map(row => (
          <TableRow
            {...row}
            key={row.id as string}
            classes={classes}
            style={{
              ...style,
              // height: row.size,
              // top: row.start,
              gridRow: 3 + row.index + hiddenScrolledRowsCount,
              // transform: `translateY(${scrollTop}px)`,
            }}
          />
        ))}
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
