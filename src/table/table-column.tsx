import styles from "./table.module.css";
import React from "react";
import { observer } from "mobx-react"
import type { TableDataRow } from "./table-row";

export type TableColumnId = string;

export interface TableDataColumn<DataItem = any> {
  id: TableColumnId;
  className?: string;
  title?: React.ReactNode;
  style?: React.CSSProperties;
  resizable?: boolean; // default: true, defines if specific column could be resized by `width`
  draggable?: boolean; // default: true, defines if specific column could be re-ordered within parent table
  sortable?: boolean; // default: true, defines if specific column could be used in sorting results
  sortingOrder?: "asc" | "desc"; // current order in sorting results
  sortValue?: (row: TableDataRow<DataItem>, col: TableDataColumn<DataItem>) => string | number,
  renderValue?: (row: TableDataRow<DataItem>, col: TableDataColumn<DataItem>) => React.ReactNode;
  onSorting?: (row: TableDataRow<DataItem>, col: TableDataColumn<DataItem>, evt: React.MouseEvent) => void;
  onResizeStart?: (row: TableDataRow<DataItem>, col: TableDataColumn<DataItem>, evt: React.MouseEvent) => void;
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
