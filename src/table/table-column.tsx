import styles from "./table.module.css";
import React from "react";
import { observer } from "mobx-react"
import type { TableDataRow } from "./table-row";
import { useDrag, useDrop } from "react-dnd";

/**
 * Unique ID for every column in grid
 */
export type TableColumnId = string;

export const tableColumnSortableType = Symbol("[this is used in drag&drop iteractions with columns]");

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
   * This event happens on successful drag & drop columns on each other when re-ordering.
   * Applicable currently only for heading columns (`table.props.columns`)
   */
  onDragAndDrop?: (dropResult: { draggable: TableDataColumn<DataItem>, droppable: TableDataColumn<DataItem> }) => void;
  /**
   * Callback to be used in rendering contents in every column (aka "data cell")
   */
  renderValue: (row: TableDataRow<DataItem>, col: TableDataColumn<DataItem>) => React.ReactNode;
}

interface TableColumnProps extends TableDataColumn {
  parentRow: TableDataRow;
}

export const TableColumn = observer((columnProps: TableColumnProps) => {
  const { className = "", style = {}, title, sortable = true, draggable = true, resizable = true, parentRow, sortingOrder } = columnProps;
  const isHeadingRow = parentRow.id === "thead";
  const sortingArrowClass = sortable && sortingOrder === "asc" ? styles.arrowUp : sortingOrder === "desc" ? styles.arrowDown : "";
  const isDraggableEnabled = isHeadingRow && draggable; // use in "thead"

  const [dragMetrics, dragRef] = isDraggableEnabled ? useDrag({
    type: tableColumnSortableType,
    item: { ...columnProps },
    collect(monitor) {
      return {
        [styles.isDragging]: monitor.isDragging(),
      }
    },
  }) : [];

  const [dropMetrics, dropRef] = isDraggableEnabled ? useDrop({
    accept: tableColumnSortableType,
    drop: (item: TableDataColumn, monitor) => {
      const droppableColumn: TableDataColumn = { ...columnProps };
      columnProps.onDragAndDrop?.({
        draggable: item,
        droppable: { ...columnProps }
      });
      return droppableColumn;
    },
    collect(monitor) {
      return {
        [styles.isDraggingOverActiveDroppable]: monitor.isOver(),
        [styles.isDroppable]: monitor.canDrop(),
      }
    },
  }) : [];

  const draggableClass = isDraggableEnabled ? [
    styles.draggable,
    ...Object.entries(dragMetrics ?? {}).filter(([param, enabled]) => enabled).map(([param]) => param),
    ...Object.entries(dropMetrics ?? {}).filter(([param, enabled]) => enabled).map(([param]) => param),
  ].join(" ") : '';

  const draggableClassName = isHeadingRow && draggable ? styles.draggable : "";
  const sortableClassName = isHeadingRow ? styles.sortable : "";
  const columnClassName = `${styles.column} ${className} ${sortableClassName} ${draggableClassName} ${draggableClass}`;

  const onClick = (evt: React.MouseEvent) => {
    if (isHeadingRow && sortable) {
      columnProps.onSorting?.(parentRow, columnProps, evt);
    }
  };

  const onResizeStart = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    columnProps.onResizeStart?.(parentRow, columnProps, evt);
  };

  return (
    <div className={columnClassName} style={style} onClick={onClick} ref={elem => dropRef?.(dragRef(elem))}>
      {isHeadingRow && sortable && sortingArrowClass && <i className={sortingArrowClass}/>}
      <div className={styles.title}>
        {title}
      </div>
      {isHeadingRow && resizable && (
        <i className={styles.resizable} onMouseDown={onResizeStart}/>
      )}
    </div>
  )
});
