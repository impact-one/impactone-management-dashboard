import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageHeader } from "../components/PageHeader";

const links = [
  { to: "/", label: "Overview" },
  { to: "/projects", label: "Projects" },
  { to: "/tasks", label: "Tasks" },
  { to: "/ioc", label: "IOC" },
  { to: "/map", label: "System map" },
];

export function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Page not found"
        lede={`“${pathname}” is not part of this pilot. Pick a known route below.`}
      />
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/">Back to the overview</Link>
        </Button>
        {links.slice(1).map((item) => (
          <Button key={item.to} variant="outline" asChild>
            <Link to={item.to}>{item.label}</Link>
          </Button>
        ))}
      </div>
    </>
  );
}
