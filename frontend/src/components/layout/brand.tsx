"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type BrandProps = {
  href?: string;
  compact?: boolean;
  iconOnly?: boolean;
  inverted?: boolean;
  className?: string;
};

export function Brand({
  href = "/",
  compact = false,
  iconOnly = false,
  inverted = false,
  className,
}: BrandProps) {
  const tBrand = useTranslations("brand");

  return (
    <Link
      href={href}
      className={cn("inline-flex min-w-0 max-w-full items-center gap-4", className)}
    >
      <Image
        src="/logo/risknova-favicon-64.svg"
        alt="RiskNova"
        width={62}
        height={62}
        priority
        className={cn(
          "rounded-xl shadow-[var(--shadow-soft)]",
          iconOnly ? "h-10 w-10" : compact ? "h-8 w-8" : "h-[58px] w-[58px] xl:h-[62px] xl:w-[62px]",
        )}
      />

      {iconOnly ? null : (
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "truncate tracking-tight",
            inverted ? "text-white" : "text-foreground",
            compact ? "text-sm font-semibold" : "text-[23px] font-semibold leading-none xl:text-[26px]",
          )}
        >
          Risk<span className="font-serif italic">Nova</span>
        </span>

        {!compact ? (
          <span
            className={cn(
              "w-full min-w-0 break-words text-left text-[13px] leading-snug xl:text-[14px]",
              inverted ? "text-amber-100/85" : "text-muted-foreground",
            )}
          >
            {tBrand("tagline")}
          </span>
        ) : null}
      </span>
      )}
    </Link>
  );
}
