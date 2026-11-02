import { useId, type ReactNode } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T extends { id: string }>({
  caption,
  columns,
  rows,
  empty = "Nothing to show.",
}: {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  empty?: string;
}) {
  const captionId = useId();
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    );
  }

  return (
    <div
      className="responsive-table max-h-[70dvh] overflow-auto rounded-xl border bg-card shadow-sm"
      tabIndex={0}
      role="region"
      aria-labelledby={captionId}
    >
      <Table className="caption-top">
        <TableCaption id={captionId} className="px-3 pt-3 text-left font-medium text-foreground">
          {caption}
        </TableCaption>
        <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
          <tr>
            {columns.map((column) => (
              <TableHead key={column.key} scope="col">
                {column.header}
              </TableHead>
            ))}
          </tr>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {columns.map((column, index) =>
                index === 0 ? (
                  <TableHead
                    key={column.key}
                    scope="row"
                    data-label={column.header}
                    className="whitespace-normal align-top font-medium text-foreground"
                  >
                    {column.render(row)}
                  </TableHead>
                ) : (
                  <TableCell key={column.key} data-label={column.header} className="whitespace-normal align-top">
                    {column.render(row)}
                  </TableCell>
                ),
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
