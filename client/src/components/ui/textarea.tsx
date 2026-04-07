import React from "react";

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      className="w-full rounded-2xl border px-3 py-2"
      {...props}
    />
  );
}