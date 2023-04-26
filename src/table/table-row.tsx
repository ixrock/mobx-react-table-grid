import styles from "./table.module.css";
import React from "react";
import { observer } from "mobx-react"
import { TableDataColumn, TableColumn } from "./table-column";

export type TableRowId = string | number;

export interface TableDataRow<DataItem = any> {
  id: TableRowId;
  data: DataItem;
  index?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: React.ReactNode; // applicable only for `props.columns` (heading)
  columns?: TableDataColumn[]; // columns in the row
}

export interface TableRowProps extends TableDataRow {
}

export const TableRow = observer((rowProps: TableRowProps) => {
  const { className = "", style = {}, title, columns } = rowProps;
  return (
    <div className={`${styles.row} ${className}`} style={style}>
      {title}
      {columns?.map(columnData => <TableColumn {...columnData} parentRow={rowProps} key={columnData.id}/>)}
    </div>
  )
});
