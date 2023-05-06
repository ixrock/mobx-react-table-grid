import type React from "react";
import { action, computed, observable } from "mobx"
import type { TableColumnId, TableDataColumn, TableDataRow, TableRowId } from "./index";
import orderBy from "lodash/orderBy";

export interface CreateTableStateParams<ResourceItem = any> {
  dataItems: ResourceItem[];
  /**
   * Columns definition as `Table.props.columns`.
   * Used to build `Table.props.rows` state.
   */
  headingColumns: TableDataColumn<ResourceItem>[];
  /**
   * Allows to customize row before processing by table (e.g. make `selectable`)
   */
  customizeRows?: (row: TableDataRow<ResourceItem>) => Partial<TableDataRow<ResourceItem>>;
  /**
   * Provide identification for data items
   * By default, tries to get unique ID via `dataItem.getById()` or `dataItem.id`
   */
  getRowId?: (dataItem: ResourceItem) => TableRowId;
}

export type CreateTableState<DataItem> = ReturnType<typeof createTableState<DataItem>>;

export function createTableState<DataItem = any>({ headingColumns, dataItems, customizeRows, getRowId }: CreateTableStateParams<DataItem>) {
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
      onResizeReset: action(({ columnId }) => {
        columnSizes.delete(columnId);
      }),
    }
  });

  const searchText = observable.box("");
  const hiddenColumns = observable.set<TableColumnId>();
  const selectedRowsId = observable.set<TableRowId>();
  const sortedColumns = observable.map<TableColumnId, "asc" | "desc">();
  const columnsOrder = observable.array<TableColumnId>(); // columns could be reordered by d&d
  const columnSizes = observable.map<TableColumnId, string>(); // columns could be resized

  const tableColumns = computed<TableDataColumn<DataItem>[]>(() => {
    if (columnsOrder.length) {
      return columnsOrder
        .map(columnId => tableColumnsAll.find(column => column.id === columnId))
        .filter(col => !hiddenColumns.has(col.id));
    } else {
      return tableColumnsAll.filter(col => !hiddenColumns.has(col.id));
    }
  });

  const tableRows = computed<TableDataRow<DataItem>[]>(() => {
    return dataItems.map((resource, resourceIndex) => {
      const row: TableDataRow = {
        get id() {
          return getRowId?.(resource)
            ?? (resource as any).id ?? (resource as any).getId?.()
            ?? resourceIndex.toString();
        },
        index: resourceIndex,
        data: resource,
        columns: tableColumns.get().map(column => {
          return {
            ...column,
            get title() {
              return column.renderValue?.(row, column)
            },
          }
        }),
      };

      if (customizeRows) {
        const customizedRow = customizeRows(row);
        const customRow = {
          ...row, // copy initial row fields
          get selected() {
            return selectedRowsId.has(row.id);
          },
          ...customizedRow, // allow to override "selected" but not "onSelect"
          onSelect: action((row: TableDataRow<DataItem>, evt: React.MouseEvent) => {
            if (selectedRowsId.has(row.id)) {
              selectedRowsId.delete(row.id);
            } else {
              selectedRowsId.add(row.id);
            }
            customizedRow.onSelect?.(customRow, evt);
          }),
        };

        return customRow;
      }

      return row;
    });
  });

  const sortedTableRows = computed<TableDataRow<DataItem>[]>(() => {
    const sortedColumnIds = Array.from(sortedColumns.keys());
    const sortingOrders = Array.from(sortedColumns.values());

    const sortingCallbacks = sortedColumnIds.map(columnId => {
      const column = tableColumnsAll.find(col => col.id === columnId);
      return (row: TableDataRow<DataItem>) => {
        return column?.sortValue?.(row, column) ?? column?.renderValue?.(row, column);
      }
    });

    return orderBy(tableRows.get(), sortingCallbacks, sortingOrders);
  });

  const searchResultTableRows = computed<TableDataRow<DataItem>[]>(() => {
    const search = searchText.get();
    return sortedTableRows.get().filter((row) => {
      return row.columns.some(col => {
        const columnContent = col.searchValue?.(row, col) ?? col.renderValue?.(row, col);
        if (typeof columnContent === "string") {
          return columnContent.toLowerCase().includes(search.toLowerCase());
        }
      })
    })
  });

  const selectedTableRowsAll = computed<TableDataRow<DataItem>[]>(() => {
    return tableRows.get().filter(row => selectedRowsId.has(row.id));
  });

  const selectedTableRowsFiltered = computed<TableDataRow<DataItem>[]>(() => {
    return searchResultTableRows.get().filter(row => selectedRowsId.has(row.id));
  });

  return {
    searchText,
    columnSizes,
    hiddenColumns,
    sortedColumns,
    tableColumns,
    tableColumnsAll,
    tableRows,
    sortedTableRows,
    searchResultTableRows,
    selectedRowsId,
    selectedTableRowsAll,
    selectedTableRowsFiltered,
  }
}
