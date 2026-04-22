"use client";

import { cn } from "@/lib/utils";
import { CATEGORY_DEFINITIONS, type SurfaceCategoryId } from "../_lib/constants";

type Props = {
  active: SurfaceCategoryId;
  onChange: (id: SurfaceCategoryId) => void;
  counts?: Partial<Record<SurfaceCategoryId, string | number>>;
};

export function CategoryTabs({ active, onChange, counts = {} }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 pb-2 md:grid-cols-3 xl:grid-cols-5">
      {CATEGORY_DEFINITIONS.map((item) => {
        const Icon = item.icon;
        const isActive = item.key === active;
        const count = counts[item.key];
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={cn(
              "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[1rem] border px-4 py-3 text-[14px] font-semibold transition-all duration-200 sm:px-5",
              isActive
                ? "border-[var(--gold)] bg-[var(--gold)] text-primary-foreground shadow-[var(--shadow-card)]"
                : "border-border bg-card text-muted-foreground hover:border-[var(--gold)]/40 hover:text-foreground",
            )}
          >
            <Icon size={16} />
            <span>{item.label}</span>
            {count !== undefined && count !== "" ? (
              <span
                className={cn(
                  "ml-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  isActive
                    ? "border-white/30 bg-white/15 text-white"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
