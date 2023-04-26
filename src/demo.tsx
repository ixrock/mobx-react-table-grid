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
    },
    {
      id: ResourceColumnId.age,
      title: <>Age</>,
      renderValue: (row) => row.data.getAge()
    },
  ],
})

export const TableDemo = inject(() => ({ store: tableState }))
(
  observer((props: { id?: string, store?: CreateTableState }) => {
    const { tableColumnsAll, sortedTableRows, hiddenColumns, tableColumns } = props.store;

    const toggleAllColumns = action(() => {
      if (tableColumnsAll.length != hiddenColumns.size) {
        hiddenColumns.replace(tableColumnsAll.map(col => col.id));
      } else {
        hiddenColumns.clear();
      }
    });

    return (
      <>
        <h1>Mobx-React CSS Grid Table</h1>
        <div className={styles.columnHiding}>
          <h2>Column hiding</h2>
          <div className={styles.columnHidingElements}>
            <label>
              <input
                defaultChecked
                type="checkbox"
                onChange={toggleAllColumns}
              /> Toggle All
            </label>
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
          rows={sortedTableRows.get()}
        />
      </>
    );
  }));

ReactDOM.render(<TableDemo/>, document.getElementById('app'));
