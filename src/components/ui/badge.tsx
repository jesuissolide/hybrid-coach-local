import React from "react";

export function Badge({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs ${className}`}
      {...props}
    />
  );
}