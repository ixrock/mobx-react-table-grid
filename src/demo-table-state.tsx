import * as styles from "./demo.module.css";
import React from "react";
import { action, observable } from "mobx"
import { CreatedTableState, createTableState } from "./table";
import { Containers, Status } from "./demo-table-components";
import { generateDemoData, ResourceColumnId, ResourceStub } from "./demo-data-generator";

export type DemoTableState = CreatedTableState<ResourceStub>;

export const demoTableState: DemoTableState = createTableState<ResourceStub>({
  tableId: "demo-table-state",
  dataItems: observable.box(generateDemoData(10_000), { deep: false }), /* generate 10K demo items */

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
              checked={demoTableState.isSelectedAll.get()}
              onChange={action(() => {
                const { searchResultTableRowIds, selectedRowsId } = demoTableState;
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
              checked={demoTableState.selectedRowsId.has(row.id)}
              onChange={(evt) => demoTableState.toggleRowSelection(row.id, evt.target.checked)}
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
      renderValue: (row) => <Containers num={row.data.getContainerNumber()}/>,
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
      renderValue: (row) => <Status status={row.data.getStatus()}/>,
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
