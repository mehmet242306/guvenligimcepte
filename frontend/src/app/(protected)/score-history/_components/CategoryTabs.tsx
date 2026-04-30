"use client";

import { cn } from "@/lib/utils";
import {
  CATEGORY_DEFINITIONS,
  getSurfaceTone,
  type SurfaceCategoryId,
} from "../_lib/constants";

type Props = {
  active: SurfaceCategoryId;
  onChange: (id: SurfaceCategoryId) => void;
  counts?: Partial<Record<SurfaceCategoryId, string | number>>;
};

export function CategoryTabs({ active, onChange, counts = {} }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 pb-2 min-[480px]:gap-3 md:grid-cols-3 xl:grid-cols-5">
      {CATEGORY_DEFINITIONS.map((item) => {
        const Icon = item.icon;
        const isActive = item.key === active;
        const count = counts[item.key];
        const tone = getSurfaceTone(item.key);
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={cn(
              "inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-[1rem] border px-2 py-2.5 text-[12px] font-semibold transition-all duration-200 min-[480px]:gap-2 min-[480px]:px-4 min-[480px]:py-3 min-[480px]:text-[14px] sm:px-5",
              isActive ? tone.tabActive : tone.tabIdle,
            )}
          >
            <Icon size={16} />
            <span>{item.label}</span>
            {count !== undefined && count !== "" ? (
              <span
                className={cn(
                  "ml-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  isActive ? tone.countActive : tone.countIdle,
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
