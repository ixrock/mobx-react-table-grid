import styles from "./table.module.scss";
import React from "react";
import { observer } from "mobx-react"
import { TableColumn, TableDataColumn } from "./table-column";
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
  elemRef?: React.Ref<HTMLDivElement>;
}

export const TableRow = observer((rowProps: TableRowProps) => {
  const currentRow = { ...rowProps };
  const { className, style = {}, columns, selectable, selected, classes = {}, elemRef, index } = rowProps;

  const rowClassName: string = [
    styles.row,
    className,
    selectable && styles.isSelectable,
    selectable && classes.selectableRow,
    selected && styles.selectedRow,
    selected && classes.selectedRow,
    classes.rowBaseClass,
  ].filter(Boolean).join(" ");

  const onSelect = (evt: React.MouseEvent) => {
    currentRow.onSelect?.(currentRow, evt);
  };

  return (
    <div className={rowClassName} style={style} data-index={index} onClick={onSelect} ref={elemRef}>
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
