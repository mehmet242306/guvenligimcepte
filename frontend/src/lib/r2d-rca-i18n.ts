import { useMemo } from "react";
import { R2D_DIMENSIONS, type R2DDimension } from "@/lib/r2d-rca-engine";

export type R2dRcaTranslate = (key: string, values?: Record<string, string | number | Date>) => string;

/** Localised C1–C9 labels for UI and charts (replaces DIMENSION_META nameTR/source). */
export function useR2dRcaDimensionMap(t: R2dRcaTranslate): Record<R2DDimension, { name: string; source: string }> {
  return useMemo(() => {
    const map = {} as Record<R2DDimension, { name: string; source: string }>;
    for (const code of R2D_DIMENSIONS) {
      map[code] = {
        name: t(`dimensions.${code}.name`),
        source: t(`dimensions.${code}.source`),
      };
    }
    return map;
  }, [t]);
}
