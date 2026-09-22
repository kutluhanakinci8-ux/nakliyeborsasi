"use client";

import type { ReactNode } from "react";

export type AdminTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

type AdminDataTableProps<T> = {
  columns: AdminTableColumn<T>[];
  rows: T[];
  emptyMessage: string;
  loading?: boolean;
};

export function AdminDataTable<T extends { id?: string }>({
  columns,
  rows,
  emptyMessage,
  loading,
}: AdminDataTableProps<T>) {
  if (loading) {
    return <p className="platform-admin-loading-inline">Veriler yükleniyor…</p>;
  }
  if (rows.length === 0) {
    return <p className="platform-admin-empty">{emptyMessage}</p>;
  }
  return (
    <div className="platform-admin-table-wrap">
      <table className="platform-admin-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? `row-${index}`}>
              {columns.map((col) => (
                <td key={col.key}>{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
