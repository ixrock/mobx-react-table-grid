@ixrock/mobx-react-table-grid
==

Easy to use and powerful table grid React-js component based on CSS-grid 

## Install | [npm](https://www.npmjs.com/package/mobx-react-table-grid)
```
npm install mobx-react-table-grid --save
```

## Benefits

- easy-to-follow and simple API _(just use as data input plain-objects and data-getters, mostly see `TableDataColumn` and `TableDataRow` interfaces)_
- table rows virtualization _(handle large amount of items, e.g. you can handle 10k pods from k8s, see the demo with generated data)_
- most of the layout done via `display: grid` with some help of css-variables _(works really fast!)_ 
- multi-columns sorting _(powered by `lodash/orderBy`)_ 
- reordering and resizing columns _(powered by `react-dnd`)_ 
- filtering columns _(show/hide/search)_ 
- rows selection state management
- handling import/export state to external storage (e.g. `window.localStorage`, see: `demo.tsx`)
- customize column sizes via css-variables `--grid-col-size-${columnId}` _(see usage in `demo.module.css`)_
- `mobx` observability for grid state management under the hood

## Demo

![Screenshot](./public/demo-sshot.png)


```
git checkout git@github.com:ixrock/mobx-react-table-grid.git
npm install
npm run dev
```




## Example

```tsx
import "mobx-react-table-grid/index.css"; // import styles (e.g. via webpack)
import React from "react"
import ReactDOM from "react-dom"
import { observable } from "mobx"
import { observer } from "mobx-react"
import { createTableState, Table } from "mobx-react-table-grid";

interface ResourceItem {
  id: string | number;
  name: string;
  hobby: string[];
  renderName(): React.ReactNode;
};

const tableState = createTableState<ResourceItem>({
  dataItems: observable.box([
    {
      id: 1,
      name: "Joe",
      hobby: ["hacking", "martial-arts"],
      renderName(){ return <b>Joel White</b> },
    },
    {
      id: 2,
      name: "Ann",
      hobby: ["dancing"],
      renderName(){ return <b>Anna Dark</b> },
    }
  ]),
  headingColumns: [
    {
      id: "index",
      title: <b>#</b>,
      renderValue: (row, col) => row.index,
    },
    {
      id: ResourceColumnId.name,
      title: <>Name</>,
      renderValue: (row, col) => row.data.renderName(),
      sortValue: (row, col) => row.data.name,
    },
    {
      id: ResourceColumnId.hobby,
      title: <>Hobby</>,
      renderValue: (row, col) => <b>{row.data.hobby.join(", ")}</b>,
      sortValue: (row, col) => row.data.hobby.join(""),
      searchValue: (row, col) => row.data.hobby.join(" "),
    },
  ]
});

const Demo = observer(() => {
  const { tableColumns, searchResultTableRows } = tableState;
  
  return <Table 
    columns={tableColumns.get()} 
    rows={searchResultTableRows.get()} 
  />
});

ReactDOM.render(<Demo/>, document.getElementById('app'));
```
