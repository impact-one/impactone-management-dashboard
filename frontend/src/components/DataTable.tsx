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
      <p className="rounded-2xl border border-dashed bg-muted/25 px-4 py-10 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    );
  }

  return (
    <div
      className="surface responsive-table no-scrollbar overflow-x-auto rounded-2xl bg-card ring-0 [&_[data-slot=table-header]]:bg-muted/45"
      role="region"
      aria-labelledby={captionId}
    >
      <Table className="caption-top">
        <TableCaption
          id={captionId}
          className="border-b border-border/60 px-4 py-3.5 text-left text-sm font-semibold text-foreground"
        >
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
                    className="h-auto whitespace-normal px-4 py-3.5 align-top text-sm font-medium leading-5 tracking-normal text-foreground normal-case"
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
