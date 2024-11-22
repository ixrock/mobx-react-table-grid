import * as styles from "./demo.module.css";
import React from "react";
import { action } from "mobx"
import { observer } from "mobx-react"
import { Table } from "./table";
import { ResourceColumnId } from "./demo-data-generator";
import { DemoTableState } from "./demo-table-state";

export const DemoTable = observer((props: { store: DemoTableState }) => {
  const {
    tableId,
    headingColumns, headingColumnsReordered, hiddenColumns,
    searchResultTableRows, searchText,
    selectedRowsId, selectedTableRowsAll,
  } = props.store;

  return (
    <>
      <h1>Mobx-React CSS Grid Table (Demo)</h1>
      <input
        autoFocus
        placeholder="Search"
        className={styles.searchText}
        defaultValue={searchText.get()}
        onChange={action((event) => searchText.set(event.target.value.trim()))}
      />
      <div className={styles.hiddenColumns}>
        <h2>Columns hiding</h2>
        <div>
          {headingColumns.map(column => {
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
        columns={headingColumnsReordered.get()}
        rows={searchResultTableRows.get()}
        classes={{
          columnBaseClass: styles.column,
          rowBaseClass: styles.row,
        }}
      />
    </>
  );
});
