import styles from "./table.module.css";
import React from "react";
import { observer } from "mobx-react"
import type { TableDataRow } from "./table-row";

/**
 * Unique ID for every column in grid
 */
export type TableColumnId = string;

export interface TableDataColumn<DataItem = any> {
  id: TableColumnId;
  title: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Defines if specific column could be resized by `width`
   * default: true
   */
  resizable?: boolean;
  /**
   * Defines if specific column could be re-ordered within parent table
   * @default: true
   */
  draggable?: boolean;
  /**
   * Defines if specific column could be used in sorting results
   * @default: true
   */
  sortable?: boolean;
  /**
   * Current state of ordering items in sorting results (if any)
   */
  sortingOrder?: "asc" | "desc";
  /**
   * Callback to be used in data sorting items in every row and column
   * By default, if this `data-getter` is not provided `renderValue(): ReactNode` would be used instead.
   * NOTE: sorting doesn't work correctly if `renderValue()` returns not a `string` or `number`.
   */
  sortValue?: (row: TableDataRow<DataItem>, col: TableDataColumn<DataItem>) => string | number,
  /**
   * This `data-getter` called when some column sorted by user action (UI event)
   * Usually this is a good place to update some external state for the table.
   */
  onSorting?: (row: TableDataRow<DataItem>, col: TableDataColumn<DataItem>, evt: React.MouseEvent) => void;
  /**
   * This `data-getter` called when some column is `resizable` and resizing event is just started by user action (UI event)
   * Usually this is a good place to update some external state for the table.
   */
  onResizeStart?: (row: TableDataRow<DataItem>, col: TableDataColumn<DataItem>, evt: React.MouseEvent) => void;
  /**
   * Callback to be used in rendering contents in every column (aka "data cell")
   */
  renderValue: (row: TableDataRow<DataItem>, col: TableDataColumn<DataItem>) => React.ReactNode;
}

interface TableColumnProps extends TableDataColumn {
  parentRow: TableDataRow;
}

export const TableColumn = observer((props: TableColumnProps) => {
  const { className = "", style = {}, title, sortable = true, draggable = true, resizable = true, parentRow, sortingOrder } = props;
  const { onSorting, onResizeStart } = props;
  const isHeadingRow = parentRow.id === "thead";
  const draggableClassName = isHeadingRow && draggable ? styles.draggable : "";
  const sortableClassName = isHeadingRow ? styles.sortable : "";
  const sortingArrowClass = sortable && sortingOrder === "asc" ? styles.arrowUp : sortingOrder === "desc" ? styles.arrowDown : "";
  const columnClassName = `${styles.column} ${className} ${sortableClassName} ${draggableClassName}`;

  const onClick = (evt: React.MouseEvent) => {
    if (isHeadingRow && sortable) {
      onSorting?.(parentRow, props, evt);
    }
  };

  const resizeStartOnMouseDown = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    onResizeStart?.(parentRow, props, evt);
  };

  return (
    <div className={columnClassName} style={style} onClick={onClick}>
      {isHeadingRow && sortable && sortingArrowClass && <i className={sortingArrowClass}/>}
      <div className={styles.title}>
        {title}
      </div>
      {isHeadingRow && resizable && (
        <i className={styles.resizable} onMouseDown={resizeStartOnMouseDown}/>
      )}
    </div>
  )
});
