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
  selected?: boolean;
  selectable?: boolean;
  onSelect?(row: TableDataRow, evt: React.MouseEvent): void;
}

export interface TableRowProps extends TableDataRow {
}

export const TableRow = observer((rowProps: TableRowProps) => {
  const { className = "", style = {}, columns, selectable, selected } = rowProps;
  const selectableClassName = selectable ? styles.selectable : "";
  const selectedClassName = selectable && selected ? styles.selectedRow : "";
  const rowClassName = `${styles.row} ${className} ${selectableClassName} ${selectedClassName}`;
  const parentRow = { ...rowProps };

  const onSelect = selectable ? (evt: React.MouseEvent) => {
    parentRow.onSelect?.(parentRow, evt);
  } : undefined;

  return (
    <div className={rowClassName} onClick={onSelect} style={style}>
      {columns.map(columnData => <TableColumn {...columnData} parentRow={parentRow} key={columnData.id}/>)}
    </div>
  )
});
