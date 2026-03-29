import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border text-center shadow-[var(--shadow-soft)]",
        compact ? "px-5 py-6" : "px-6 py-8 sm:px-8 sm:py-10",
        "bg-card",
        className,
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted text-primary">
          <span className="text-lg font-semibold">RN</span>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground sm:text-xl">
            {title}
          </h3>

          {description ? (
            <p className="max-w-xl text-sm leading-7 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </div>
  );
}
