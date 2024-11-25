import * as styles from "./table.module.css";
import React from "react";
import type { TableClassNames } from "./table";
import type { TableDataRow } from "./table-row";
import { useDrag, useDrop } from "react-dnd";
import { tableColumnSortableType, tableTheadRowId } from "./table-tokens";
import debounce from "lodash/debounce";
import throttle from "lodash/throttle";

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
   * @default 100px
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
  onSorting?: (row: TableDataRow<DataItem>, col: TableDataColumn<DataItem>, evt: React.MouseEvent | React.KeyboardEvent) => void;
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
   * WARNING: sorting doesn't work correctly if `renderValue()` returns `React.ReactNode` (not a "string" or "number")
   */
  sortValue?: (row: TableDataRow<DataItem>, col: TableDataColumn<DataItem>) => string | number,
  /**
   * This callback could be used in filtering rows from search.
   * Provide it to the columns definition (heading) when their `renderValue()` returns non-`string` ReactNode.
   */
  searchValue?: (row: TableDataRow<DataItem>, col: TableDataColumn<DataItem>) => string;
}

export interface TableColumnProps extends TableDataColumn {
  parentRow: TableDataRow;
  classes?: TableClassNames;
  elemRef?: React.RefCallback<HTMLDivElement>;
}

export function TableColumn({ parentRow, ...columnProps }: TableColumnProps) {
  const isHeadingRow = parentRow.id === tableTheadRowId;
  const {
    id: columnId,
    className, title, style, sortingOrder,
    sortable = isHeadingRow,
    draggable = isHeadingRow,
    resizable = isHeadingRow,
    minSize, classes = {}, elemRef, renderValue,
  } = columnProps;
  const columnDataItem = { ...columnProps, resizable, draggable, sortable, classes };
  const resizeStartOffset = { x: 0, y: 0 };
  let isDragging = false;

  const [dragMetrics, dragRef] = draggable ? useDrag({
    type: tableColumnSortableType,
    item: columnDataItem,
    collect(monitor) {
      return {
        [`${styles.isDragging} ${classes.draggableColumnActive ?? ""}`]: monitor.isDragging(),
      }
    },
  }) : [];

  const [dropMetrics, dropRef] = draggable ? useDrop({
    accept: tableColumnSortableType,
    drop: (item: TableDataColumn, monitor) => {
      columnProps.onDragAndDrop?.({
        draggable: item,
        droppable: columnDataItem,
      });
      return columnDataItem;
    },
    collect(monitor) {
      return {
        [`${styles.isDroppable} ${classes.droppableColumn ?? ""}`]: monitor.canDrop(),
        [`${styles.isDropReady} ${classes.droppableColumnActive ?? ""}`]: monitor.isOver(),
      }
    },
  }) : [];

  const draggableClasses = draggable ? [
    styles.isDraggable,
    classes.draggableColumn ?? "",
    ...Object.entries(dragMetrics ?? {}).filter(([, enabled]) => enabled).map(([className]) => className.trim()),
    ...Object.entries(dropMetrics ?? {}).filter(([, enabled]) => enabled).map(([className]) => className.trim()),
  ] : [];

  const sortableClasses = sortable ? [
    styles.isSortable,
    classes.sortableColumn ?? "",
  ] : [];

  const sortingArrowClass = [
    styles.sortingArrow,
    classes.sortingArrow,
    sortingOrder === "asc" ? [styles.arrowUp, classes.sortingArrowAsc]
      : sortingOrder === "desc" ? [styles.arrowDown, classes.sortingArrowDesc]
        : "",
  ].flat().filter(Boolean).join(" ");

  const columnClassName = [
    styles.column,
    classes.columnBaseClass,
    resizable ? classes.resizableColumn ?? "" : "",
    ...draggableClasses,
    ...sortableClasses,
    className,
  ].filter(Boolean).join(" ");

  // debouncing for checking drag&drop event firing state before sorting anything out ;)
  const onSorting = sortable ? debounce(evt => {
    if (isDragging) return; // skip sorting if reordering columns has started

    if (isHeadingRow && sortable) {
      columnProps.onSorting?.(parentRow, columnDataItem, evt);
    }
  }, 50) : undefined;

  const onResizeStart = resizable ? (evt: React.MouseEvent) => {
    evt.stopPropagation();
    evt.preventDefault();

    const resizerElem = evt.target as HTMLElement;
    let columnWidth = resizerElem.closest(`.${styles.column}`).scrollWidth;

    resizeStartOffset.x = evt.pageX;
    resizeStartOffset.y = evt.pageY;

    columnProps.onResizeStart?.({ columnId, size: columnWidth }, evt);

    const onResizing = throttle((evt: MouseEvent) => {
      const offsetX = evt.pageX - resizeStartOffset.x;
      const offsetY = evt.pageY - resizeStartOffset.y;

      columnProps.onResizing?.({
        columnId, offsetX, offsetY,
        size: Math.max(minSize, columnWidth + offsetX),
      }, evt);
    }, 50);

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

  const onResizeReset = resizable ? (evt: React.MouseEvent) => {
    columnProps.onResizeReset?.({ columnId }, evt);
  } : undefined;

  const onDragStart = draggable ? (evt: React.DragEvent) => {
    isDragging = true;
  } : undefined;

  const onDragEnd = draggable ? (evt: React.DragEvent) => {
    isDragging = false;
  } : undefined;

  const bindRef = (elem: HTMLDivElement) => {
    elemRef?.(elem);
    dropRef?.(dragRef?.(elem));
  };

  const accessibilityProps: React.HTMLProps<HTMLElement> = isHeadingRow && sortable ? {
    role: "button",
    tabIndex: 0, // allow to focus heading column with [Tab]
    "aria-label": sortingOrder ? `Sorted by ${typeof title === "string" ? title : columnId}` : undefined,
    "aria-sort": sortingOrder ? `${sortingOrder}ending` : "none",
  } : {};

  return (
    <div
      {...accessibilityProps}
      className={columnClassName} style={style}
      onDragStart={onDragStart} onDragEnd={onDragEnd}
      onMouseDown={onSorting} onKeyDown={evt => evt.key === "Enter" && onSorting(evt)}
      ref={bindRef}
    >
      {isHeadingRow && (
        <>
          {sortable && sortingArrowClass && <i className={sortingArrowClass}/>}
          <div className={`${styles.title} ${classes.theadTitleClass ?? ""}`}>
            {title}
          </div>
          {resizable && (
            <TableColumnDragIconSvg
              className={classes.resizableColumn}
              onMouseDown={onResizeStart}
              onDoubleClick={onResizeReset}
            />
          )}
        </>
      )}
      {!isHeadingRow && (renderValue?.(parentRow, columnDataItem))}
    </div>
  )
}

export function TableColumnDragIconSvg({ className, ...props }: React.PropsWithChildren & React.SVGAttributes<any>) {
  const classNames = `${styles.resizeIcon} ${className ?? ""}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={classNames} {...props}>
      <path
        d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2s.9-2 2-2s2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2s-2 .9-2 2s.9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2z"></path>
    </svg>
  );
}

