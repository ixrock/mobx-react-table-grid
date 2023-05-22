import styles from "./table.module.scss";
import React from "react";
import { observer } from "mobx-react"
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TableDataRow, TableRow } from "./table-row";
import type { TableDataColumn } from "./table-column";
import { tableHeaderRowId, tableTheadRowId } from "./table-constants";
import { useVirtualization } from "./useVirtualization";

export interface TableProps<DataItem = any> {
  id?: string;
  className?: string;
  classes?: TableClassNames;
  style?: React.CSSProperties;
  /**
   * Use or not rows virtualization to render table grid.
   * When `true` table element must have some defined height.
   * @default true
   */
  virtual?: boolean;
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
   * Min-size (width) for all columns by default, could be changed/resized from UI
   * @default 100
   */
  minSizeAllColumns?: number;
  /**
   * Default fixed row size (height) for "grid-auto-rows"
   * @default 50
   */
  rowSize?: number;
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
    virtual = true,
    header = null,
    rows = [],
    columns = [],
    rowSize = 50,
    minSizeAllColumns = 100,
    children,
  } = props;

  const { maxScrollHeight, virtualRows, scrolledRowsCount } = useVirtualization({
    rows: rows,
    parentElemRef: tableElemRef,
    rowSize: rowSize,
    enabled: virtual,
  });

  const cssVars = {
    ...style,
    [`--grid-cols`]: makeCssGridTemplate(columns),
    [`--grid-row-size`]: `${rowSize}px`,
    [`--grid-col-min-size`]: minSizeAllColumns ? `${minSizeAllColumns}px` : undefined,
    [`--grid-virtual-max-height`]: `${maxScrollHeight}px`,
  } as React.CSSProperties;

  const className: string = [
    styles.table,
    props.className,
  ].filter(Boolean).join(" ");

  const addColumnDefaults = (column: TableDataColumn): TableDataColumn => {
    return {
      ...column,
      minSize: column.minSize ?? minSizeAllColumns,
    }
  };

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
          columns={columns.map(addColumnDefaults)}
          classes={classes}
          data={null}
        />
        {virtualRows.map((row, index) => (
          <TableRow
            {...row}
            key={row.id as string}
            classes={classes}
            columns={row.columns.map(addColumnDefaults)}
            style={{
              gridRow: virtual ? (3/*header + thead*/ + index + scrolledRowsCount) : undefined,
              ...style,
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
