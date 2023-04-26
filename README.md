@ixrock/mobx-react-table-grid
==

Easy to use and powerful react table-grid based on CSS-grid layout component

## Benefits

- easy-to-follow and simple API of grid component _(use as grid's data input plain-objects and data-getters, see also: `table.props.columns`)_
- table rows virtualization _(handle large data, e.g. 10k items in the demo table)_
- most of the layout done via `display: grid` with some help of css-variables _(works really fast!)_ 
- multi-columns sorting _(powered by `lodash/orderBy`)_ 
- reordering and resizing columns with D&D _[TODO]_ 
- customize column sizes via css-variables `--grid-col-size-${columnId}` _(see also: `demo.module.css`)_
- `mobx` observability for grid state management under the hood

## Demo

```
npm install
npm run dev
```

## Example

```tsx
import { observable } from "mobx"
import { inject, observer } from "mobx-react"
import { createTableState, Table } from "./table-index";

interface MyTableGridDataItem {
  name: string
  getName(): React.ReactNode;
};

const tableState = createTableState<MyTableGridDataItem>({
  dataItems: observable.array<MyTableGridDataItem>([/*...*/]),
  
  headingColumns: [
    {
      id: "index",
      title: <b>#</b>,
      renderValue: (row, col) => row.index,
    },
    {
      id: ResourceColumnId.name,
      title: <>Name</>,
      renderValue: (row, col) => row.data.getName(),
      sortValue: (row, col) => row.data.name,
    },
  ]
});

const TableGridDemoApp = observer(() => {
  /* get observable state from globals -OR- inject via `mobx-react/@inject` */
  const { tableColumns, sortedTableRows } = tableState;

  return <Table
    header={<b>Table Header</b>}
    columns={tableColumns.get()}
    rows={sortedTableRows.get()}
  />
});
```
