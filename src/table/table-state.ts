import type React from "react";
import { action, computed, IComputedValue, IObservableValue, observable } from "mobx"
import { exportState, TableColumnId, TableDataColumn, TableDataRow, TableRowId } from "./index";
import orderBy from "lodash/orderBy";

export type CreatedTableState<DataItem = any> = ReturnType<typeof createTableState<DataItem>>; /* observables + computed */
export type StorableCreateTableState<DataItem = any> = ReturnType<typeof exportState<DataItem>>; /* plain json */

export interface ResourceWithId {
  id?: TableRowId;
  getId?(): TableRowId;
}

export interface CreateTableStateParams<ResourceItem = any> {
  tableId: string;
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
   * Provide uniq ID for data items
   */
  getRowId?: (dataItem: ResourceItem & ResourceWithId) => TableRowId;
  /**
   * Handle filtering results with search field
   * mobx.computed() or mobx.observable.box() that participates in filtered rows state.
   */
  searchBox?: IComputedValue<string> | IObservableValue<string>;
}

// TODO: split into multiple files for better readability
export function createTableState<DataItem = any>(params: CreateTableStateParams<DataItem>) {
  const { tableId, dataItems, customizeRows, getRowId, searchBox } = params;

  const searchText = searchBox ?? observable.box("", { name: "search-box" });
  const hiddenColumns = observable.set<TableColumnId>([], { name: "hidden-columns" });
  const selectedRowsId = observable.set<TableRowId>([], { name: "selected-rows" });
  const sortedColumns = observable.map<TableColumnId, "asc" | "desc">({}, { name: "sorted-columns" });
  const columnsOrder = observable.array<TableColumnId>([], { name: "columns-order" }); // columns could be reordered by d&d
  const columnSizes = observable.map<TableColumnId, string>([], { name: "columns-size" }); // columns could be resized

  const headingColumns: TableDataColumn<DataItem>[] = params.headingColumns.map((headColumn) => {
    const dataColumn = {} as TableDataColumn<DataItem>;
    const columnDescriptorsInitial = Object.getOwnPropertyDescriptors<TableDataColumn<DataItem>>(headColumn);
    const columnDescriptorsEvents = Object.getOwnPropertyDescriptors<Partial<TableDataColumn<DataItem>>>({
      get sortingOrder() {
        return sortedColumns.get(headColumn.id); // current sorting columns state
      },
      onSorting: action((row, column, evt) => {
        const isMultiSorting = evt.metaKey || evt.shiftKey;
        const order = sortedColumns.get(column.id);
        if (!isMultiSorting && (!order || sortedColumns.size > 1)) {
          sortedColumns.clear();
        }
        if (!order) sortedColumns.set(column.id, "desc");
        if (order === "desc") sortedColumns.set(column.id, "asc");
        if (order === "asc") sortedColumns.delete(column.id);
      }),

      // re-ordering columns state
      onDragAndDrop: action(({ draggable, droppable }) => {
        const currentOrder = columnsOrder.length ? [...columnsOrder] : headingColumns.map(column => column.id);
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

    return Object.defineProperties(dataColumn, {
      ...columnDescriptorsInitial,
      ...columnDescriptorsEvents,
    });
  });

  const headingColumnsReordered = computed<TableDataColumn<DataItem>[]>(() => {
    if (columnsOrder.length) {
      return columnsOrder
        .map(columnId => headingColumns.find(column => column.id === columnId))
        .filter(col => !hiddenColumns.has(col.id));
    } else {
      return headingColumns.filter(col => !hiddenColumns.has(col.id));
    }
  }, {
    name: "table-columns"
  });

  const getRowIdFromDataItem = (resource: DataItem & ResourceWithId, index: number) => {
    return getRowId?.(resource) ?? resource.id ?? resource.getId?.() ?? String(index);
  };

  const tableRows = computed<TableDataRow<DataItem>[]>(() => {
    return dataItems.get().map((resource, resourceIndex) => {
      let row: TableDataRow<DataItem> = {
        get id() {
          return getRowIdFromDataItem(resource, resourceIndex);
        },
        index: resourceIndex,
        data: resource,
        columns: headingColumnsReordered.get(),
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
        row = Object.defineProperties(row, Object.getOwnPropertyDescriptors(rowOverrides));
      }

      return row;
    });
  }, {
    name: "table-rows"
  });

  const sortedTableRows = computed<TableDataRow<DataItem>[]>(() => {
    const sortedColumnIds = Array.from(sortedColumns.keys());
    const sortingOrders = Array.from(sortedColumns.values());

    const sortingCallbacks = sortedColumnIds.map(columnId => {
      const column = headingColumns.find(col => col.id === columnId);
      return (row: TableDataRow<DataItem>) => {
        return column?.sortValue?.(row, column) ?? column?.renderValue?.(row, column);
      }
    });

    return orderBy(tableRows.get(), sortingCallbacks, sortingOrders);
  }, {
    name: "sorted-table-rows"
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
  }, {
    name: "search-results-table-rows",
  });

  const searchResultTableRowIds = computed<TableRowId[]>(() => {
    return searchResultTableRows.get().map(row => row.id);
  }, {
    name: "search-result-table-rows-id",
  });

  const selectedTableRowsAll = computed<TableDataRow<DataItem>[]>(() => {
    return tableRows.get().filter(row => selectedRowsId.has(row.id));
  }, {
    name: "selected-table-rows-all",
  });

  const selectedTableRowsFiltered = computed<TableDataRow<DataItem>[]>(() => {
    return searchResultTableRows.get().filter(row => selectedRowsId.has(row.id));
  }, {
    name: "selected-table-rows-filtered",
  });

  const tableRowIds = computed<TableRowId[]>(() => {
    return dataItems.get().map((dataItem, index) => getRowIdFromDataItem(dataItem, index));
  }, {
    name: "table-rows-id",
  });

  const isSelectedAll = computed<boolean>(() => {
    return tableRowIds.get().every(rowId => selectedRowsId.has(rowId));
  }, {
    name: "is-selected-all",
  });

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
    tableId,
    searchText,
    columnSizes,
    columnsOrder,
    hiddenColumns,
    sortedColumns,
    headingColumns,
    headingColumnsReordered,
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
