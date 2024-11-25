import * as styles from "./demo.module.css";
import React from "react";
import { action, computed } from "mobx"
import { observer } from "mobx-react"
import { Table, TableDataRow } from "./table";
import { DemoTableState } from "./demo-table-state";
import GithubIcon from "../public/github.svg";
import { fuzzyMatch } from "./fuzzy-match";

export const DemoTable = observer((props: { store: DemoTableState }) => {
  const {
    tableId,
    headingColumns, headingColumnsReordered, hiddenColumns,
    sortedTableRows, searchText, tableRowsMap,
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

  const tableColumns = computed(() => headingColumnsReordered.get());

  const fuzzyMatched = (item: TableDataRow) => {
    const search = searchText.get().trim();
    if (!search) return true;

    const searchAreas = [
      item.data.getName(),
      item.data.getNs(),
      item.data.getNode(),
      item.data.getQoS(),
      item.data.getStatus(),
    ].join("\n");

    return fuzzyMatch(searchAreas, searchText.get(), {
      matchCase: false,
      strict: true, // every word should be found in search source areas
    })
  }

  const tableRows = computed(() => {
    return sortedTableRows.get().filter(fuzzyMatched); // custom serch
  });

  const onSearchChange = action((text: string, evt: React.ChangeEvent) => {
    searchText.set(text);
  });

  return (
    <>
      <h1>Mobx-React CSS Grid Table (demo: {totalItemsCount} items)</h1>
      <div className={styles.install}>
        <h2>Install via NPM:</h2>
        <div>
          <code onClick={copyInstallToBufferFromEvent}> npm i mobx-react-table-grid</code>
          {copied && <span className={styles.copied}/>}
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
        onChange={event => onSearchChange(event.target.value.trim(), event)}
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
        columns={tableColumns.get()}
        rows={tableRows.get()}
        classes={{
          columnBaseClass: styles.column,
          rowBaseClass: styles.row,
        }}
      />
    </>
  );
});
