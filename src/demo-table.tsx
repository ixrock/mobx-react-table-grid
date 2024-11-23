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
    searchResultTableRows, searchText, tableRows,
    selectedRowsId, selectedTableRowsAll,
  } = props.store;

  const totalItemsCount = new Intl.NumberFormat().format(tableRows.get().length);

  return (
    <>
      <h1>Mobx-React CSS Grid Table (demo: {totalItemsCount} items)</h1>
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
          {headingColumns.map(({ id: columnId, title }) => {
            const columnName = columnId === "index" ? "Index" : title;
            const toggleVisibility = action(() => {
              hiddenColumns.has(columnId) ? hiddenColumns.delete(columnId) : hiddenColumns.add(columnId)
            });
            return (
              <label key={columnId}>
                <input type="checkbox" defaultChecked={!hiddenColumns.has(columnId)} onChange={toggleVisibility}/> {columnName}
              </label>
            )
          })}
        </div>
      </div>

      {selectedRowsId.size > 0 && (
        <div className={styles.selectedRows}>
          <h2>Selected names ({selectedRowsId.size})</h2>
          {selectedTableRowsAll.get().map(row => {
            const column = row.columns.find(row => row.id === ResourceColumnId.name);
            const title = column.renderValue(row, column);
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
