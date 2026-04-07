import React from "react";

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return (
    <input
      className="w-full rounded-2xl border px-3 py-2"
      {...props}
    />
  );
}