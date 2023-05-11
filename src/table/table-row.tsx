import styles from "./table.module.scss";
import React from "react";
import { observer } from "mobx-react"
import { TableDataColumn, TableColumn } from "./table-column";
import type { TableClassNames } from "./table";

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
  onSelect?(row: TableDataRow<DataItem>, evt: React.MouseEvent): void;
}

export interface TableRowProps extends TableDataRow {
  classes?: TableClassNames;
}

export const TableRow = observer((rowProps: TableRowProps) => {
  const parentRow = { ...rowProps };
  const { className = "", style = {}, columns, selectable, selected, classes = {} } = rowProps;

  const selectableClassName: string = selectable ? [
    styles.selectable,
    classes.selectableRow,
    selected ? [styles.selectedRow, classes.selectedRow] : [],
  ].flat().join(" ") : "";

  const onSelect = (evt: React.MouseEvent) => {
    parentRow.onSelect?.(parentRow, evt);
  };

  return (
    <div className={`${styles.row} ${className} ${selectableClassName}`} onClick={onSelect} style={style}>
      {columns.map(columnData => {
        return (
          <TableColumn
            {...columnData}
            key={columnData.id}
            parentRow={parentRow}
            classes={classes}
          />
        )
      })}
    </div>
  )
});
