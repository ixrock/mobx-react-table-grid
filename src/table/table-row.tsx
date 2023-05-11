import styles from "./table.module.scss";
import React from "react";
import { observer } from "mobx-react"
import { TableDataColumn, TableColumn } from "./table-column";
import type { TableClassNames } from "./table";
import { tableTheadRowId } from "./table-constants";

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
  const currentRow = { ...rowProps };
  const { className = "", style = {}, columns, selectable, selected, classes = {} } = rowProps;
  const isHeadingRow = currentRow.id === tableTheadRowId;

  const selectableClassName: string = selectable ? [
    styles.selectable,
    classes.selectableRow,
    selected ? [styles.selected, classes.selectedRow] : [],
  ].flat().filter(Boolean).join(" ") : "";

  const rowClassName: string = [
    styles.row,
    !isHeadingRow ? classes.rowBaseClass : "",
    selectableClassName,
    className,
  ].filter(Boolean).join(" ");

  const onSelect = (evt: React.MouseEvent) => {
    currentRow.onSelect?.(currentRow, evt);
  };

  return (
    <div className={rowClassName} style={style} onClick={onSelect}>
      {columns.map(columnData => {
        return (
          <TableColumn
            {...columnData}
            key={columnData.id}
            parentRow={currentRow}
            classes={classes}
          />
        )
      })}
    </div>
  )
});
