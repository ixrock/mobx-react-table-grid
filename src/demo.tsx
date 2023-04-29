import styles from "./demo.module.css";
import React from "react";
import ReactDOM from "react-dom";
import { inject, observer } from "mobx-react"
import { action, observable } from "mobx"
import { CreateTableState, createTableState, Table } from "./table";
import { makeData, renderContainers, renderStatus, ResourceColumnId, ResourceStub } from "./make-data";

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
      renderValue: (row) => row.data.getName()
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
})

export const Demo = inject(() => ({ store: tableState }))
(
  observer((props: { id?: string, store?: CreateTableState }) => {
    const { tableColumnsAll, hiddenColumns, tableColumns, searchResultTableRows, searchText } = props.store;

    return (
      <>
        <h1>Mobx-React CSS Grid Table</h1>
        <div className={styles.columnFilters}>
          <input
            placeholder="Search"
            className={styles.searchText}
            defaultValue={searchText.get()}
            onChange={(event) => searchText.set(event.target.value.trim())}
          />
          <h2>Columns hiding</h2>
          <div className={styles.columnsHiding}>
            {tableColumnsAll.map(column => {
              return (
                <label key={column.id}>
                  <input
                    type="checkbox"
                    defaultChecked
                    onChange={action(() => {
                      hiddenColumns.has(column.id) ? hiddenColumns.delete(column.id) : hiddenColumns.add(column.id);
                    })}
                  /> {column.title}
                </label>
              )
            })}
          </div>
        </div>

        <Table
          paddingStart={30}
          rowSize={50}
          className={styles.demoTable}
          header={<b>Table Header</b>}
          columns={tableColumns.get()}
          rows={searchResultTableRows.get()}
        />
      </>
    );
  }));

ReactDOM.render(<Demo/>, document.getElementById('app'));
