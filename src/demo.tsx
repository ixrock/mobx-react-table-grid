import React from "react";
import ReactDOM from "react-dom";
import { observer } from "mobx-react"
import { action, observable } from "mobx"
import { bindAutoSaveChangesToStorage, CreatedTableState, createTableState, Table } from "./table";
import { makeData, renderContainers, renderStatus, ResourceColumnId, ResourceStub } from "./make-data";

// better to include own project styles after "mobx-react-table-grid/index.css"
import styles from "./demo.module.scss";

export const tableId = "demo";

// this might be observable state from external stores, injectables, etc.
const dataItems = observable.box(makeData(10_000));

export const tableState = createTableState<ResourceStub>({
  dataItems,

  // heading columns and data-accessors definitions
  headingColumns: [
    {
      id: "checkbox",
      size: "40px",
      className: styles.checkbox,
      resizable: false,
      draggable: false,
      sortable: false,
      get title() {
        return (
          <label onClick={evt => evt.stopPropagation()}>
            <input
              type="checkbox"
              checked={tableState.isSelectedAll.get()}
              onChange={action(() => {
                const { searchResultTableRowIds, selectedRowsId } = tableState;
                const selectingRows = searchResultTableRowIds.get();
                const allSelected = selectingRows.every(rowId => selectedRowsId.has(rowId));
                if (!allSelected) {
                  selectingRows.forEach(rowId => selectedRowsId.add(rowId));
                } else {
                  selectingRows.forEach(rowId => selectedRowsId.delete(rowId));
                }
              })}
            />
          </label>
        );
      },
      renderValue: (row) => {
        return (
          <label onClick={evt => evt.stopPropagation()}>
            <input
              type="checkbox"
              checked={tableState.selectedRowsId.has(row.id)}
              onChange={(evt) => tableState.toggleRowSelection(row.id, evt.target.checked)}
            />
          </label>
        )
      },
    },
    {
      id: "index",
      title: "#",
      className: styles.indexColumn,
      resizable: false, // size is fixed in css via `--grid-col-size-index` variable within a table.
      renderValue: (row) => row.index + 1,
    },
    {
      id: ResourceColumnId.name,
      title: <>Name</>,
      renderValue: (row) => row.data.getName(),
    },
    {
      id: ResourceColumnId.namespace,
      title: <>Namespace</>,
      renderValue: (row) => row.data.getNs()
    },
    {
      id: ResourceColumnId.containers,
      className: styles.containersColumn,
      title: <>Containers</>,
      renderValue: (row) => renderContainers(row.data.getContainerNumber()),
      sortValue: (row) => row.data.getContainerNumber(),
    },
    {
      id: ResourceColumnId.restarts,
      title: <>Restarts</>,
      className: styles.restartsColumn,
      minSize: 100, // px
      resizable: false, // column size is fixed (see: `demo.module.css`)
      draggable: false, // column position is fixed in gird (d&d is off)
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
      sortValue: (row) => row.data.getStatus(), // to make sorting results right in case when `renderValue()` returns non-simple `ReactNode` (e.g. not a `string`)
      searchValue: (row) => row.data.getStatus(), // to make this column searchable *we must* specify this when `renderValue()` returns complex `ReactNode`
    },
    {
      id: ResourceColumnId.age,
      title: <>Age</>,
      renderValue: (row) => new Date(row.data.getAge()).toLocaleString()
    },
  ],
  customizeRows(row) {
    return {
      selectable: false, // checkboxes are used to select items
      onSelect(row, evt) {
        console.log('[DETAILS]:', row, evt);
        // uncomment when `{selectable:true}` and remove `onChange()`-handler from checkbox (replace to mock)
        // tableState.toggleRowSelection(row.id);
      }
    };
  }
});

export const Demo = observer((props: { id?: string, store: CreatedTableState<ResourceStub> }) => {
  const { tableColumnsAll, hiddenColumns, tableColumns, searchResultTableRows, searchText, selectedRowsId, selectedTableRowsAll } = props.store;

  return (
    <>
      <h1>Mobx-React CSS Grid Table</h1>
      <input
        autoFocus
        placeholder="Search"
        className={styles.searchText}
        defaultValue={searchText.get()}
        onChange={action((event) => searchText.set(event.target.value.trim()))}
      />
      <div className={styles.hiddenColumns}>
        <h2>Columns hiding</h2>
        <div className={styles.columnsHiding}>
          {tableColumnsAll.map(column => {
            if (column.id == "checkbox") return;
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

      {selectedRowsId.size > 0 && (
        <div className={styles.selectedRows}>
          <h2>Selected names ({selectedRowsId.size})</h2>
          {selectedTableRowsAll.get().map(row => {
            const title = row.columns.find(row => row.id === ResourceColumnId.name).title;
            return (
              <div className={styles.selectedItem} key={String(row.id)}>
                {title}
                <i className={styles.unselectItem} onClick={() => selectedRowsId.delete(row.id)}/>
              </div>
            )
          })}
          <button className={styles.unselectAll} onClick={() => selectedRowsId.clear()}>Unselect All</button>
        </div>
      )}

      <Table
        id={tableId}
        className={styles.demoTable}
        header={<b>Table Header</b>}
        columns={tableColumns.get()}
        rows={searchResultTableRows.get()}
        classes={{
          columnBaseClass: styles.column,
          rowBaseClass: styles.row,
          sortingArrowAsc: "up",
          sortingArrowDesc: "down",
        }}
      />
    </>
  );
});

/**
 * Preload, import and auto-save table-state changes with `window.localStorage`
 */
bindAutoSaveChangesToStorage<ResourceStub>({
  tableId,
  tableState,
  async toStorage(tableId, state) {
    console.log(`[SAVING STATE]: id=${tableId}`, state);
    sessionStorage.setItem(tableId, JSON.stringify(state));
  },
  async fromStorage(tableId: string) {
    return JSON.parse(sessionStorage.getItem(tableId) ?? `{}`);
  }
}).then(() => {
  ReactDOM.render(<Demo store={tableState}/>, document.getElementById('app'));
});
