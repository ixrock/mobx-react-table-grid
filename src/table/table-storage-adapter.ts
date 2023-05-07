import { reaction, comparer } from "mobx";
import { type CreatedTableState, importState, StorableCreateTableState, toJSON } from "./table-state";

export interface BindAutoSaveToStorageParams<DataItem> {
  tableId: string;
  tableState: CreatedTableState<DataItem>;
  savingDelay?: number;
  fromStorage(tableId: string): Promise<StorableCreateTableState<DataItem>>; // preload
  toStorage(tableId: string, state: StorableCreateTableState<DataItem>): unknown; // store
}

export async function bindAutoSaveChangesToStorage<DataItem>(
  { tableId, tableState, fromStorage, toStorage, savingDelay = 250 }: BindAutoSaveToStorageParams<DataItem>
) {
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
  return reaction(() => toJSON(tableState), serializableState => toStorage(tableId, serializableState), {
    name: `[Table id="${tableId}"]: export state handler`,
    delay: savingDelay,
    equals: comparer.structural,
  });
}
