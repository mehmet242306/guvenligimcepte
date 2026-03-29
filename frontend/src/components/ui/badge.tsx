import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type BadgeVariant =
  | "default"
  | "accent"
  | "neutral"
  | "success"
  | "warning"
  | "danger";

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "border-primary/20 bg-primary/10 text-primary",
  accent:
    "border-accent/20 bg-accent/10 text-accent",
  neutral:
    "border-border bg-secondary text-muted-foreground",
  success:
    "border-success/20 bg-success/10 text-success",
  warning:
    "border-warning/20 bg-warning/10 text-warning",
  danger:
    "border-danger/20 bg-danger/10 text-danger",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
