import React from "react";

export function Progress({
  value = 0,
  className = "",
}: {
  value?: number;
  className?: string;
}) {
  return (
    <div className={`h-3 w-full rounded-full bg-gray-200 ${className}`}>
      <div
        className="h-3 rounded-full bg-black transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}