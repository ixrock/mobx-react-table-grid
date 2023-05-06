import styles from "./table.module.css";
import React from "react";
import { observer } from "mobx-react"
import { TableDataColumn, TableColumn } from "./table-column";

export type TableRowId = string | number | symbol;

export interface TableDataRow<DataItem = any> {
  id: TableRowId;
  data: DataItem;
  index?: number;
  className?: string;
  style?: React.CSSProperties;
  columns: TableDataColumn[];
}

export interface TableRowProps extends TableDataRow {
  onClick?(evt: React.MouseEvent): void;
}

export const TableRow = observer((rowProps: TableRowProps) => {
  const { className = "", style = {}, columns, onClick } = rowProps;
  const parentRow = { ...rowProps };
  return (
    <div className={`${styles.row} ${className}`} onClick={onClick} style={style}>
      {columns?.map(columnData => <TableColumn {...columnData} parentRow={parentRow} key={columnData.id}/>)}
    </div>
  )
});
