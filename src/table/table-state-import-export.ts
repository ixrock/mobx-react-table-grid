import { comparer, reaction } from "mobx";
import { CreatedTableState, StorableCreateTableState } from "./table-state";

export interface ImportStateParams<DataItem> {
  tableState: CreatedTableState<DataItem>;
  storedState?: StorableCreateTableState<DataItem>;
}

export function importState<DataItem>({ tableState, storedState }: ImportStateParams<DataItem>) {
  if (!storedState) return;
  const { columnsSizes = [], sortedColumns = [], columnsOrder, hiddenColumns = [], searchText = "" } = storedState;

  tableState.searchText.set(searchText);
  tableState.sortedColumns.replace(sortedColumns);
  tableState.columnsOrder.replace(columnsOrder);
  tableState.columnSizes.replace(columnsSizes);
  tableState.hiddenColumns.replace(hiddenColumns);
}

export function exportState<DataItem>(state: CreatedTableState<DataItem>) {
  const { searchText, hiddenColumns, sortedColumns, columnSizes, columnsOrder } = state;

  return {
    searchText: searchText.get(),
    hiddenColumns: hiddenColumns.toJSON(),
    sortedColumns: sortedColumns.toJSON(),
    columnsOrder: columnsOrder.toJSON(),
    columnsSizes: columnSizes.toJSON(),
  }
}

export interface PersistTableStateParams<DataItem = any> {
  tableState: CreatedTableState<DataItem>;
  savingDelayMs?: number; /* default: 250 */
  fromStorage(tableId: string): Promise<StorableCreateTableState<DataItem>>; // load data
  toStorage(tableId: string, state: StorableCreateTableState<DataItem>): Promise<void>; // store data
}

export async function persistTableState<DataItem>(
  { tableState, fromStorage, toStorage, savingDelayMs = 250 }: PersistTableStateParams<DataItem>
) {
  const { tableId } = tableState;

  /**
   * Preloading state if any from storage and import to existing table
   */
  const storedState = await fromStorage(tableId).catch(() => null);
  if (storedState) {
    importState({ storedState, tableState });
  }

  /**
   * Bind auto-saving changes as mobx-reaction from table-state to `window.localStorage`
   */
  return reaction(() => exportState(tableState), serializableState => toStorage(tableId, serializableState), {
    name: `[Table id="${tableId}"]: export state handler`,
    delay: savingDelayMs,
    equals: comparer.structural,
  });
}
