import type { SVGProps } from "react";

/** Monochrome Slack mark — uses currentColor to match sidebar icons. */
export function SlackIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M6.2 15.2a1.9 1.9 0 1 1-1.9-1.9h1.9v1.9zm1 0a1.9 1.9 0 1 1 3.8 0v4.8a1.9 1.9 0 1 1-3.8 0v-4.8zM8.9 6.2a1.9 1.9 0 1 1 1.9-1.9v1.9H8.9zm0 1a1.9 1.9 0 1 1 0 3.8H4.1a1.9 1.9 0 1 1 0-3.8h4.8zM17.8 8.9a1.9 1.9 0 1 1 1.9 1.9h-1.9V8.9zm-1 0a1.9 1.9 0 1 1-3.8 0V4.1a1.9 1.9 0 1 1 3.8 0v4.8zM15.1 17.8a1.9 1.9 0 1 1-1.9 1.9v-1.9h1.9zm0-1a1.9 1.9 0 1 1 0-3.8h4.8a1.9 1.9 0 1 1 0 3.8h-4.8z" />
    </svg>
  );
}
