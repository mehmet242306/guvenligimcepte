import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
};

export function Input({
  className,
  containerClassName,
  label,
  hint,
  error,
  id,
  name,
  type = "text",
  ...props
}: InputProps) {
  const fieldId = id ?? (typeof name === "string" ? name : undefined);
  const hintId = fieldId ? `${fieldId}-hint` : undefined;
  const errorId = fieldId ? `${fieldId}-error` : undefined;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("flex flex-col gap-2", containerClassName)}>
      {label ? (
        <label
          htmlFor={fieldId}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
      ) : null}

      <input
        id={fieldId}
        name={name}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        className={cn(
          "h-12 w-full rounded-2xl border px-4 text-sm text-foreground transition-colors transition-shadow",
          "border-border bg-card",
          "shadow-[var(--shadow-soft)]",
          "hover:border-primary/40",
          "focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_var(--ring)]",
          error &&
            "border-danger focus-visible:shadow-[0_0_0_4px_rgba(220,38,38,0.12)]",
          className,
        )}
        {...props}
      />

      {hint ? (
        <p id={hintId} className="text-xs leading-5 text-muted-foreground">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-xs font-medium leading-5 text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
