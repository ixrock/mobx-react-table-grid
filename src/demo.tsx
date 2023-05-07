import styles from "./demo.module.css";
import React from "react";
import ReactDOM from "react-dom";
import { observer } from "mobx-react"
import { action, observable } from "mobx"
import { CreatedTableState, createTableState, Table, bindAutoSaveChangesToStorage } from "./table";
import { makeData, renderContainers, renderStatus, ResourceColumnId, ResourceStub } from "./make-data";

export const tableId = "demo";

export const tableState = createTableState<ResourceStub>({
  // some observable state from external stores, injectables, etc.
  dataItems: observable.array(makeData(10_000)),

  // heading columns and data-accessors definitions
  headingColumns: [
    {
      id: "index",
      title: <b>#</b>,
      resizable: false, // column size is fixed (see: `.demoTable` css-class)
      className: styles.indexColumn,
      renderValue: (row) => row.index,
    },
    {
      id: ResourceColumnId.name,
      title: <>Name</>,
      draggable: false, // keeps fixed position in grid, not possible to re-order
      renderValue: (row) => row.data.getName(),
    },
    {
      id: ResourceColumnId.namespace,
      title: <>Namespace</>,
      renderValue: (row) => row.data.getNs()
    },
    {
      id: ResourceColumnId.containers,
      title: <>Containers</>,
      renderValue: (row) => renderContainers(row.data.getContainerNumber()),
      sortValue: (row) => row.data.getContainerNumber(),
    },
    {
      id: ResourceColumnId.restarts,
      title: <>Restarts</>,
      resizable: false, // column size is fixed (see: `demo.module.css`)
      renderValue: (row) => row.data.getRestarts()
    },
    {
      id: ResourceColumnId.node,
      title: <>Node</>,
      renderValue: (row) => row.data.getNode(),
    },
    {
      id: ResourceColumnId.qos,
      title: <>QoS</>,
      renderValue: (row) => row.data.getQoS()
    },
    {
      id: ResourceColumnId.status,
      title: <>Status</>,
      renderValue: (row) => renderStatus(row.data.getStatus()),
      sortValue: (row) => row.data.getStatus(),
      searchValue: (row) => row.data.getStatus(), // to make this column searchable *we must* specify this callback cause `renderValue()` returns non-`string` ReactNode
    },
    {
      id: ResourceColumnId.age,
      title: <>Age</>,
      renderValue: (row) => row.data.getAge()
    },
  ],
  customizeRows() {
    return {
      selectable: true,
      onSelect(row) {
        console.log('[SELECT-ITEM]:', row);
      }
    };
  }
});

export const Demo = observer((props: { id?: string, store: CreatedTableState<ResourceStub> }) => {
  const { tableColumnsAll, hiddenColumns, tableColumns, searchResultTableRows, searchText, selectedRowsId, selectedTableRowsAll } = props.store;

  const selectedRowsInfo = selectedTableRowsAll.get().map(row => {
    const title = row.columns.find(row => row.id === ResourceColumnId.name).title;
    return (
      <div className={styles.selectedItem} key={String(row.id)}>
        {title}
        <i className={styles.unselectItem} onClick={action(() => selectedRowsId.delete(row.id))}/>
      </div>
    )
  });

  return (
    <>
      <h1>Mobx-React CSS Grid Table</h1>
      <input
        placeholder="Search"
        className={styles.searchText}
        defaultValue={searchText.get()}
        onChange={action((event) => searchText.set(event.target.value.trim()))}
      />
      <div className={styles.columnFilters}>
        <h2>Columns hiding</h2>
        <div className={styles.columnsHiding}>
          {tableColumnsAll.map(column => {
            return (
              <label key={column.id}>
                <input
                  type="checkbox"
                  defaultChecked={!hiddenColumns.has(column.id)}
                  onChange={action(() => hiddenColumns.has(column.id) ? hiddenColumns.delete(column.id) : hiddenColumns.add(column.id))}
                /> {column.title}
              </label>
            )
          })}
        </div>
      </div>

      {selectedRowsInfo.length > 0 && (
        <div className={styles.selectedRows}>
          <h2>Selected names</h2>
          {selectedRowsInfo}
          <button className={styles.unselectAll} onClick={() => selectedRowsId.clear()}>Unselect All</button>
        </div>
      )}

      <Table
        id={tableId}
        paddingStart={30}
        rowSize={50}
        className={styles.demoTable}
        header={<b>Table Header</b>}
        columns={tableColumns.get()}
        rows={searchResultTableRows.get()}
      />
    </>
  );
});

/**
 * Preload, import and auto-save table-state changes with `window.localStorage`
 */
await bindAutoSaveChangesToStorage<ResourceStub>({
  tableId, tableState,
  toStorage(tableId, state) {
    console.log(`[SAVING STATE]: id=${tableId}`, state);
    window.localStorage.setItem(tableId, JSON.stringify(state));
  },
  async fromStorage(tableId: string) {
    return JSON.parse(window.localStorage.getItem(tableId) ?? `{}`);
  }
});

// Render app with last used state
ReactDOM.render(<Demo store={tableState}/>, document.getElementById('app'));
