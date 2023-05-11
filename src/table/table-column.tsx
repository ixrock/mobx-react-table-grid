import styles from "./table.module.scss";
import React from "react";
import { observer } from "mobx-react"
import type { TableClassNames } from "./table";
import type { TableDataRow } from "./table-row";
import { useDrag, useDrop } from "react-dnd";
import { tableColumnSortableType, tableTheadRowId } from "./table-constants";
import debounce from "lodash/debounce";

/**
 * Unique ID for every column in grid
 */
export type TableColumnId = string;

export interface TableDataColumn<DataItem = any> {
  id: TableColumnId;
  /**
   * Contents of the column that will be rendered.
   */
  title: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Current state (width) of resized/resizing column (if any)
   */
  size?: string;
  /**
   * Min-size of the column (width), that can be resized to it manually
   * @default 50px
   */
  minSize?: number;
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
   * Current state of table items in sorting results (if any)
   */
  sortingOrder?: "asc" | "desc";
  /**
   * This `data-getter` called when some column sorted by user action (UI event)
   * Usually this is a good place to update some external state for the table.
   */
  onSorting?: (row: TableDataRow<DataItem>, col: TableDataColumn<DataItem>, evt: React.MouseEvent) => void;
  /**
   * This `data-getter` called when some column is `resizable` and resizing events by user action (UI event)
   * Usually this is a good place to update some external state for the table (e.g. column sizes).
   */
  onResizeStart?: (info: { columnId: TableColumnId, size: number }, evt: React.MouseEvent) => void;
  onResizing?: (info: { columnId: TableColumnId, size: number, offsetX: number, offsetY: number }, evt: MouseEvent) => void;
  onResizeEnd?: (info: { columnId: TableColumnId, size: number, offsetX: number, offsetY: number }, evt: MouseEvent) => void;
  onResizeReset?: (info: { columnId: TableColumnId }, evt: React.MouseEvent) => void;
  /**
   * This event happens on successful drag & drop columns on each other when re-ordering.
   * Applicable currently only for heading columns (`table.props.columns`)
   */
  onDragAndDrop?: (result: { draggable: TableDataColumn<DataItem>, droppable: TableDataColumn<DataItem> }) => void;
  /**
   * Callback to be used in rendering contents in every column (aka "data cell")
   */
  renderValue?: (row: TableDataRow<DataItem>, col: TableDataColumn<DataItem>) => React.ReactNode;
  /**
   * Callback to be used in data sorting items in every row and column
   * By default, if this `data-getter` is not provided `renderValue(): ReactNode` would be used instead.
   * NOTE: sorting doesn't work correctly if `renderValue()` returns not a `string` or `number`.
   */
  sortValue?: (row: TableDataRow<DataItem>, col: TableDataColumn<DataItem>) => string | number,
  /**
   * This callback could be used in filtering rows from search.
   * Provide it to the columns definition (heading) when their `renderValue()` returns non-`string` ReactNode.
   */
  searchValue?: (row: TableDataRow<DataItem>, col: TableDataColumn<DataItem>) => string;
}

export interface TableColumnProps extends TableDataColumn {
  classes?: TableClassNames;
  parentRow: TableDataRow;
}

export const TableColumn = observer((columnProps: TableColumnProps) => {
  const {
    id: columnId,
    className, title, style, parentRow, sortingOrder,
    sortable = true, draggable = true, resizable = true,
    minSize = 50, classes = {},
  } = columnProps;

  const isHeadingRow = parentRow.id === tableTheadRowId;
  const sortingArrowClass = sortable && sortingOrder === "asc" ? styles.arrowUp : sortingOrder === "desc" ? styles.arrowDown : "";
  const isDraggableEnabled = isHeadingRow && draggable;
  const isSortableEnabled = isHeadingRow && sortable;
  const isResizingEnabled = isHeadingRow && resizable;
  const columnDataItemCopy = { ...columnProps };
  const resizeStartOffset = { x: 0, y: 0 };
  let isDragging = false;

  const [dragMetrics, dragRef] = isDraggableEnabled ? useDrag({
    type: tableColumnSortableType,
    item: columnDataItemCopy,
    collect(monitor) {
      return {
        [`${styles.isDragging} ${classes.draggableColumnActive ?? ""}`]: monitor.isDragging(),
      }
    },
  }) : [];

  const [dropMetrics, dropRef] = isDraggableEnabled ? useDrop({
    accept: tableColumnSortableType,
    drop: (item: TableDataColumn, monitor) => {
      columnProps.onDragAndDrop?.({
        draggable: item,
        droppable: columnDataItemCopy,
      });
      return columnDataItemCopy;
    },
    collect(monitor) {
      return {
        [`${styles.isDroppable} ${classes.droppableColumn ?? ""}`]: monitor.canDrop(),
        [`${styles.isDropReady} ${classes.droppableColumnActive ?? ""}`]: monitor.isOver(),
      }
    },
  }) : [];

  const draggableClasses = isDraggableEnabled ? [
    styles.draggable,
    classes.draggableColumn,
    ...Object.entries(dragMetrics ?? {}).filter(([, enabled]) => enabled).map(([className]) => className.trim()),
    ...Object.entries(dropMetrics ?? {}).filter(([, enabled]) => enabled).map(([className]) => className.trim()),
  ] : [];

  const sortableClasses = isSortableEnabled ? [
    styles.sortable,
    classes.sortableColumn,
  ] : [];

  const columnClassName = [
    styles.column, className,
    isResizingEnabled && classes.resizableColumn,
    ...draggableClasses,
    ...sortableClasses,
  ].filter(Boolean).join(" ");

  // debouncing for checking drag&drop event firing state before sorting anything out ;)
  const onSorting = isSortableEnabled ? debounce((evt: React.MouseEvent) => {
    if (isDragging) return; // skip sorting if reordering columns has started

    if (isHeadingRow && sortable) {
      columnProps.onSorting?.(parentRow, columnDataItemCopy, evt);
    }
  }, 50) : undefined;

  const onResizeStart = isResizingEnabled ? (evt: React.MouseEvent) => {
    evt.stopPropagation();
    evt.preventDefault();

    const resizerElem = evt.target as HTMLElement;
    let columnWidth = resizerElem.parentElement.scrollWidth;

    resizeStartOffset.x = evt.pageX;
    resizeStartOffset.y = evt.pageY;

    columnProps.onResizeStart?.({ columnId, size: columnWidth }, evt);

    const onResizing = (evt: MouseEvent) => {
      const offsetX = evt.pageX - resizeStartOffset.x;
      const offsetY = evt.pageY - resizeStartOffset.y;

      columnProps.onResizing?.({
        columnId, offsetX, offsetY,
        size: Math.max(minSize, columnWidth + offsetX),
      }, evt);
    };

    document.body.addEventListener("mousemove", onResizing);
    document.body.addEventListener("mouseup", function onResizeEnd(evt) {
      const offsetX = evt.pageX - resizeStartOffset.x;
      const offsetY = evt.pageY - resizeStartOffset.y;

      columnProps.onResizeEnd?.({
        columnId, offsetX, offsetY,
        size: columnWidth + offsetX,
      }, evt);

      document.body.removeEventListener("mousemove", onResizing);
      document.body.removeEventListener("mouseup", onResizeEnd);
    });
  } : undefined;

  const onResizeReset = isResizingEnabled ? (evt: React.MouseEvent) => {
    columnProps.onResizeReset?.({ columnId }, evt);
  } : undefined;

  const onDragStart = isDraggableEnabled ? (evt: React.DragEvent) => {
    isDragging = true;
  } : undefined;

  const onDragEnd = isDraggableEnabled ? (evt: React.DragEvent) => {
    isDragging = false;
  } : undefined;

  return (
    <div
      className={columnClassName} style={style}
      onDragStart={onDragStart} onDragEnd={onDragEnd} onMouseDown={onSorting}
      ref={elem => dropRef?.(dragRef(elem))}
    >
      {isHeadingRow && sortable && sortingArrowClass && <i className={sortingArrowClass}/>}
      <div className={styles.title}>
        {title}
      </div>
      {isHeadingRow && resizable && (
        <i className={styles.resizable} onMouseDown={onResizeStart} onDoubleClick={onResizeReset}/>
      )}
    </div>
  )
});
