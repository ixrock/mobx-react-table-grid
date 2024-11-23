import * as styles from "./demo.module.css";
import React from "react";
import { CreatedTableState, createTableState } from "./table";
import { Containers, Status } from "./demo-table-components";
import { generateDemoData, ResourceColumnId, ResourceStub } from "./demo-data-generator";

export type DemoTableState = CreatedTableState<ResourceStub>;

export const demoTableState: DemoTableState = createTableState<ResourceStub>({
  tableId: "demo-table-state",
  items: generateDemoData(50_000),
  columns: [
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
    return { selectable: true };
  }
});
