"use client";

export function ButtonLoader(props: { label: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
      {props.label}
    </span>
  );
}
