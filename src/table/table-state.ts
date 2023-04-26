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

      // adding sorting ability to columns
      get sortingOrder() {
        return sortedColumns.get(headColumn.id);
      },
      onSorting: action((row, column, evt) => {
        const order = sortedColumns.get(column.id);
        if (!order) sortedColumns.set(column.id, "asc");
        if (order === "asc") sortedColumns.set(column.id, "desc");
        if (order === "desc") sortedColumns.delete(column.id);
      }),

      // adding resizing columns ability
      onResizeStart(row, column, evt) {
        console.log("[RESIZE]:", row, column, evt)
      }
    }
  });

  const hiddenColumns = observable.set<TableColumnId>();
  const sortedColumns = observable.map<TableColumnId, "asc" | "desc">();

  const tableColumns = computed<TableDataColumn[]>(() => {
    return tableColumnsAll.filter(col => !hiddenColumns.has(col.id));
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
            id: column.id,
            className: column.className,
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
  }
}
