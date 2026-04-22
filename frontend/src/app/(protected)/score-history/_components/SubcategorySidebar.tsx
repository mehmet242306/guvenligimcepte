"use client";

import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SIDEBAR_ITEM_ACTIVE,
  SIDEBAR_ITEM_BASE,
  SIDEBAR_ITEM_INACTIVE,
  getSidebarBadgeClass,
} from "../_lib/constants";

export type SidebarItem = {
  id: string;
  title: string;
  description?: string;
  badge?: string;
};

type Props = {
  title?: string;
  items: SidebarItem[];
  activeItemId: string | null;
  onSelect: (id: string) => void;
  footer?: React.ReactNode;
  emptyLabel?: string;
};

export function SubcategorySidebar({
  title = "Alt Kategoriler",
  items,
  activeItemId,
  onSelect,
  footer,
  emptyLabel = "İçerik bulunmuyor.",
}: Props) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-muted/30 p-3">
      <div className="mb-3 flex items-center gap-2 px-2">
        <Filter size={16} className="text-[var(--gold)]" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 px-4 py-6 text-center text-xs text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          items.map((item) => {
            const isActive = item.id === activeItemId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(SIDEBAR_ITEM_BASE, isActive ? SIDEBAR_ITEM_ACTIVE : SIDEBAR_ITEM_INACTIVE)}
              >
                <span className="flex-1 pr-3">
                  <span className="block font-medium leading-6">{item.title}</span>
                  {item.description ? (
                    <span
                      className={cn(
                        "mt-0.5 block text-xs leading-5",
                        isActive ? "text-white/75" : "text-muted-foreground",
                      )}
                    >
                      {item.description}
                    </span>
                  ) : null}
                </span>
                {item.badge ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      getSidebarBadgeClass(isActive),
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>

      {footer ? <div className="mt-4 border-t border-[#e3c58f] pt-4">{footer}</div> : null}
    </div>
  );
}
