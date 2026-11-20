import { cn } from "@/core/utils/cn.js";
import EmptyState from "./EmptyState.jsx";
import Skeleton from "./Skeleton.jsx";

function getCellValue(row, column) {
  if (typeof column.accessor === "function") {
    return column.accessor(row);
  }
  if (column.accessorKey) {
    return column.accessorKey
      .split(".")
      .reduce((value, key) => value?.[key], row);
  }
  return undefined;
}

function getRowKey(row, index, getRowId) {
  if (typeof getRowId === "function") return getRowId(row);
  if (typeof getRowId === "string") return row[getRowId];
  return row.id ?? row._id ?? index;
}

export default function DataTable({
  columns,
  data = [],
  rows,
  isLoading = false,
  skeletonRows = 5,
  emptyTitle = "Aucun résultat",
  emptyDescription = "Les données apparaîtront ici dès qu’elles seront disponibles.",
  emptyState,
  getRowId,
  onRowClick,
  rowClassName,
  caption,
  className,
}) {
  const tableRows = rows ?? data;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id ?? column.accessorKey ?? column.header}
                  scope="col"
                  className={cn("whitespace-nowrap px-4 py-3", column.className)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading
              ? Array.from({ length: skeletonRows }, (_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`}>
                    {columns.map((column, columnIndex) => (
                      <td
                        key={
                          column.id ??
                          column.accessorKey ??
                          `${rowIndex}-${columnIndex}`
                        }
                        className="px-4 py-4"
                      >
                        <Skeleton className="h-4 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : tableRows.map((row, rowIndex) => (
                  <tr
                    key={getRowKey(row, rowIndex, getRowId)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "text-slate-700 transition-colors hover:bg-slate-50",
                      onRowClick && "cursor-pointer",
                      typeof rowClassName === "function"
                        ? rowClassName(row)
                        : rowClassName,
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.id ?? column.accessorKey ?? column.header}
                        className={cn("px-4 py-3.5", column.className)}
                      >
                        {column.cell
                          ? column.cell(getCellValue(row, column), row)
                          : String(getCellValue(row, column) ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {!isLoading && tableRows.length === 0 && (
        <div className="border-t border-slate-100 px-4 py-8">
          {emptyState ?? (
            <EmptyState title={emptyTitle} description={emptyDescription} />
          )}
        </div>
      )}
    </div>
  );
}
