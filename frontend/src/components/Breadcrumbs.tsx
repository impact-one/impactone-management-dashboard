import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Breadcrumbs({
  items,
  className,
}: {
  items: { label: string; to?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("mb-3", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 ? <ChevronRightIcon className="size-3.5 shrink-0 opacity-60" aria-hidden="true" /> : null}
              <li>
                {item.to && !last ? (
                  <Link to={item.to} className="font-medium text-foreground underline-offset-4 hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <span className={last ? "font-medium text-foreground" : undefined} aria-current={last ? "page" : undefined}>
                    {item.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
