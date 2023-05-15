import type React from "react";
import { action, computed, IComputedValue, IObservableValue, observable } from "mobx"
import type { TableColumnId, TableDataColumn, TableDataRow, TableRowId } from "./index";
import orderBy from "lodash/orderBy";

export type CreatedTableState<DataItem> = ReturnType<typeof createTableState<DataItem>>; /* observables + computed */
export type StorableCreateTableState<DataItem> = ReturnType<typeof toJSON<DataItem>>; /* plain json */

export interface CreateTableStateParams<ResourceItem = any> {
  dataItems: IComputedValue<ResourceItem[]>;
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
  /**
   * Handle filtering results with search field
   * mobx.computed() or mobx.observable.box() that participates in filtered rows state.
   */
  searchBox?: IComputedValue<string> | IObservableValue<string>;
}

export function createTableState<DataItem = any>(params: CreateTableStateParams<DataItem>) {
  const { headingColumns, dataItems, customizeRows, getRowId, searchBox } = params;

  const searchText = searchBox ?? observable.box("");
  const hiddenColumns = observable.set<TableColumnId>();
  const selectedRowsId = observable.set<TableRowId>();
  const sortedColumns = observable.map<TableColumnId, "asc" | "desc">();
  const columnsOrder = observable.array<TableColumnId>(); // columns could be reordered by d&d
  const columnSizes = observable.map<TableColumnId, string>(); // columns could be resized

  const tableColumnsAll: TableDataColumn<DataItem>[] = headingColumns.map((headColumn) => {
    const dataColumn = {} as TableDataColumn<DataItem>;
    const columnDescriptorsInitial = Object.getOwnPropertyDescriptors<TableDataColumn<DataItem>>(headColumn);
    const columnDescriptorsEvents = Object.getOwnPropertyDescriptors<Partial<TableDataColumn<DataItem>>>({
      get sortingOrder() {
        return sortedColumns.get(headColumn.id); // current sorting columns state
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
        return headColumn.size ?? columnSizes.get(headColumn.id);
      },
      onResizing: action(({ columnId, size }) => {
        columnSizes.set(columnId, `${size}px`);
      }),
      onResizeReset: action(({ columnId }) => {
        columnSizes.delete(columnId);
      }),
    } as Partial<TableDataColumn<DataItem>>);

    // don't call any getters at early stage (e.g. `get title(): ReactNode`)
    return Object.defineProperties(dataColumn, {
      ...columnDescriptorsInitial,
      ...columnDescriptorsEvents,
    });
  });

  const tableColumns = computed<TableDataColumn<DataItem>[]>(() => {
    if (columnsOrder.length) {
      return columnsOrder
        .map(columnId => tableColumnsAll.find(column => column.id === columnId))
        .filter(col => !hiddenColumns.has(col.id));
    } else {
      return tableColumnsAll.filter(col => !hiddenColumns.has(col.id));
    }
  });

  const getRowIdFromDataItem = (resource: DataItem, index: number) => {
    return getRowId?.(resource)
      ?? (resource as any).id ?? (resource as any).getId?.()
      ?? index.toString();
  };

  const tableRows = computed<TableDataRow<DataItem>[]>(() => {
    return dataItems.get().map((resource, resourceIndex) => {
      const row: TableDataRow<DataItem> = {
        get id() {
          return getRowIdFromDataItem(resource, resourceIndex);
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
        get selected() {
          return selectedRowsId.has(row.id);
        },
        onSelect: action((row: TableDataRow<DataItem>, evt: React.MouseEvent) => {
          if (row.selectable) {
            if (selectedRowsId.has(row.id)) selectedRowsId.delete(row.id);
            else selectedRowsId.add(row.id);
          }
          customizedRow?.onSelect?.(row, evt);
        })
      };

      // customize every data-row object with saving initial field descriptors (e.g. getters/setters would work as expected)
      const customizedRow = customizeRows?.(row);
      if (customizedRow) {
        const { onSelect, ...rowOverrides } = customizedRow;
        return Object.defineProperties(row, Object.getOwnPropertyDescriptors(rowOverrides));
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

  const searchResultTableRowIds = computed<TableRowId[]>(() => {
    return searchResultTableRows.get().map(row => row.id);
  });

  const selectedTableRowsAll = computed<TableDataRow<DataItem>[]>(() => {
    return tableRows.get().filter(row => selectedRowsId.has(row.id));
  });

  const selectedTableRowsFiltered = computed<TableDataRow<DataItem>[]>(() => {
    return searchResultTableRows.get().filter(row => selectedRowsId.has(row.id));
  });

  const tableRowIds = computed<TableRowId[]>(() => {
    return dataItems.get().map((dataItem, index) => getRowIdFromDataItem(dataItem, index));
  });

  const isSelectedAll = computed<boolean>(() => tableRowIds.get().every(rowId => selectedRowsId.has(rowId)));

  const toggleRowSelectionAll = action((force?: boolean) => {
    if (!isSelectedAll.get() && !force) {
      selectedRowsId.replace(tableRowIds.get());
    } else {
      selectedRowsId.clear();
    }
  });

  const toggleRowSelection = action((rowId: TableRowId, force?: boolean) => {
    if (selectedRowsId.has(rowId) && !force) {
      selectedRowsId.delete(rowId)
    } else {
      selectedRowsId.add(rowId);
    }
  });

  return {
    searchText,
    columnSizes,
    columnsOrder,
    hiddenColumns,
    sortedColumns,
    tableColumns,
    tableColumnsAll,
    tableRowIds,
    tableRows,
    sortedTableRows,
    searchResultTableRows,
    searchResultTableRowIds,
    selectedRowsId,
    selectedTableRowsAll,
    selectedTableRowsFiltered,
    isSelectedAll,
    toggleRowSelection,
    toggleRowSelectionAll,
  }
}

export interface ImportStateParams<DataItem> {
  tableState: CreatedTableState<DataItem>;
  storedState?: StorableCreateTableState<DataItem>;
}

export function importState<DataItem>({ tableState, storedState }: ImportStateParams<DataItem>) {
  if (!storedState) return;
  const { columnsSizes = [], sortedColumns = [], columnsOrder, hiddenColumns = [], selectedRowsId = [], searchText = "" } = storedState;

  tableState.searchText.set(searchText);
  tableState.sortedColumns.replace(sortedColumns);
  tableState.columnsOrder.replace(columnsOrder);
  tableState.columnSizes.replace(columnsSizes);
  tableState.hiddenColumns.replace(hiddenColumns);
  tableState.selectedRowsId.replace(selectedRowsId);
}

export function toJSON<DataItem>(state: CreatedTableState<DataItem>) {
  const { searchText, hiddenColumns, selectedRowsId, sortedColumns, columnSizes, columnsOrder } = state;

  return {
    searchText: searchText.get(),
    hiddenColumns: hiddenColumns.toJSON(),
    selectedRowsId: selectedRowsId.toJSON(),
    sortedColumns: sortedColumns.toJSON(),
    columnsOrder: columnsOrder.toJSON(),
    columnsSizes: columnSizes.toJSON(),
  }
}
