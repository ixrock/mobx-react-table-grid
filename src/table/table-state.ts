import { action, computed, observable } from "mobx"
import type { TableColumnId, TableDataColumn, TableDataRow } from "./index";
import orderBy from "lodash/orderBy";

export interface CreateTableStateParams<ResourceItem = any> {
  dataItems: ResourceItem[];
  headingColumns: TableDataColumn<ResourceItem>[]; // same as `Table.props.columns`
}

export type CreateTableState = ReturnType<typeof createTableState>;

export function createTableState<DataItem = any>({ headingColumns, dataItems }: CreateTableStateParams) {
  let tableColumnsAll: TableDataColumn<DataItem>[] = headingColumns.map((headColumn) => {
    return {
      // copy heading columns definition
      ...headColumn,

      // sorting columns state
      get sortingOrder() {
        return sortedColumns.get(headColumn.id);
      },
      onSorting: action((row, column, evt) => {
        const order = sortedColumns.get(column.id);
        if (!order) sortedColumns.set(column.id, "asc");
        if (order === "asc") sortedColumns.set(column.id, "desc");
        if (order === "desc") sortedColumns.delete(column.id);
      }),

      // re-ordering columns state
      onDragAndDrop: action(({ draggable, droppable }) => {
        const currentOrder = columnsOrder.length ? [...columnsOrder] : tableColumnsAll.map(column => column.id);
        const dragIndex = currentOrder.indexOf(draggable.id);
        const dropIndex = currentOrder.indexOf(droppable.id);
        const firstItem = currentOrder[dragIndex];
        currentOrder[dragIndex] = currentOrder[dropIndex];
        currentOrder[dropIndex] = firstItem;
        columnsOrder.replace(currentOrder);
      }),

      // resizing columns state
      get size() {
        return columnSizes.get(headColumn.id);
      },
      onResizing: action(({ columnId, size }) => {
        columnSizes.set(columnId, `${size}px`);
      }),
    }
  });

  const hiddenColumns = observable.set<TableColumnId>();
  const sortedColumns = observable.map<TableColumnId, "asc" | "desc">();
  const columnsOrder = observable.array<TableColumnId>(); // columns could be reordered by d&d
  const columnSizes = observable.map<TableColumnId, string>(); // columns could be resized

  const tableColumns = computed<TableDataColumn[]>(() => {
    if (columnsOrder.length) {
      return columnsOrder
        .map(columnId => tableColumnsAll.find(column => column.id === columnId))
        .filter(col => !hiddenColumns.has(col.id));
    } else {
      return tableColumnsAll.filter(col => !hiddenColumns.has(col.id));
    }
  });

  const tableRows = computed<TableDataRow[]>(() => {
    return dataItems.map((resource, resourceIndex) => {
      const resourceId = resource.getId();
      const row: TableDataRow = {
        id: resourceId,
        index: resourceIndex,
        data: resource,
        columns: tableColumns.get().map(column => {
          return {
            ...column,
            get title() {
              return column.renderValue?.(row, column)
            },
          }
        })
      };
      return row;
    });
  });

  const sortedTableRows = computed<TableDataRow[]>(() => {
    const sortedColumnIds = Array.from(sortedColumns.keys());
    const sortingOrders = Array.from(sortedColumns.values());

    const sortingCallbacks = sortedColumnIds.map(columnId => {
      const column = tableColumnsAll.find(col => col.id === columnId);
      return (row: TableDataRow) => {
        return column?.sortValue?.(row, column) ?? column?.renderValue?.(row, column);
      }
    });

    return orderBy(tableRows.get(), sortingCallbacks, sortingOrders);
  });

  return {
    tableColumnsAll,
    hiddenColumns,
    sortedColumns,
    tableColumns,
    tableRows,
    sortedTableRows,
    columnSizes,
  }
}
