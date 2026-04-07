import React from "react";

export function Button({
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-2xl border px-4 py-2 text-sm font-medium transition hover:opacity-90 ${className}`}
      {...props}
    />
  );
}