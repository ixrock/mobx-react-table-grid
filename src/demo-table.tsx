import * as styles from "./demo.module.css";
import React from "react";
import { action } from "mobx"
import { observer } from "mobx-react"
import { Table } from "./table";
import { DemoTableState } from "./demo-table-state";
import GithubIcon from "../public/github.svg";

export const DemoTable = observer((props: { store: DemoTableState }) => {
  const {
    tableId,
    headingColumns, headingColumnsReordered, hiddenColumns,
    searchResultTableRows, searchText, tableRowsMap,
    selectedRowsId, selectedTableRowsAll,
  } = props.store;

  const totalItemsCount = new Intl.NumberFormat().format(tableRowsMap.get().size);
  const [copied, setCopied] = React.useState(false);

  const copyInstallToBufferFromEvent = async (event: React.MouseEvent) => {
    try {
      await navigator.clipboard.writeText((event.target as HTMLHtmlElement).innerText);
      setCopied(true);
    } catch (err) {
      window.alert(`Could not copy to clipboard: ${err}`);
    } finally {
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <>
      <h1>Mobx-React CSS Grid Table (demo: {totalItemsCount} items)</h1>
      <div className={styles.install}>
        <h2>Install via NPM:</h2>
        <div>
          <code onClick={copyInstallToBufferFromEvent}> npm i mobx-react-table-grid</code>
          {copied && <span className={styles.copied}> (copied)</span>}
        </div>
        <a href="https://github.com/ixrock/mobx-react-table-grid" target="_blank" className={styles.githubIcon}>
          <img src={GithubIcon} width={20} height={20} alt="Github sources"/>
        </a>
      </div>
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
          {Object.values(headingColumns).map(({ id: columnId, title }) => {
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
            return (
              <div className={styles.selectedItem} key={String(row.id)}>
                {row.data.getName()}
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
