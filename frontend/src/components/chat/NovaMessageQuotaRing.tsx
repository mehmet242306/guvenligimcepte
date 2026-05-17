"use client";

import { useMemo } from "react";
import {
  getNovaQuotaRingPercent,
  getNovaQuotaTone,
  type NovaMessageQuota,
} from "@/lib/nova/message-quota";
import { getNovaUiLanguage } from "@/lib/nova-ui";

const RING_RADIUS = 15.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type NovaMessageQuotaRingProps = {
  quota: NovaMessageQuota | null;
  loading?: boolean;
  locale?: string | null;
  className?: string;
  /** Header icin kucuk yerlesim — ekstra satir yuksekligi olusturmaz */
  compact?: boolean;
};

export function NovaMessageQuotaRing({
  quota,
  loading = false,
  locale,
  className = "",
  compact = false,
}: NovaMessageQuotaRingProps) {
  const language = getNovaUiLanguage(locale);
  const isTr = language === "tr";

  const copy = useMemo(
    () =>
      isTr
        ? {
            kalan: "kalan",
            unlimited: "∞",
            loading: "…",
            title: (remaining: string, limit: string) =>
              `Kalan Nova mesaj hakkı: ${remaining} / ${limit} (bu ay)`,
            titleUnlimited: "Sınırsız Nova mesaj hakkı",
            titleEmpty: "Aylık Nova mesaj kotanız doldu",
            aria: (remaining: string, limit: string) =>
              `Kalan mesaj hakkı ${remaining} / ${limit}`,
          }
        : {
            kalan: "left",
            unlimited: "∞",
            loading: "…",
            title: (remaining: string, limit: string) =>
              `Nova messages remaining: ${remaining} / ${limit} (this month)`,
            titleUnlimited: "Unlimited Nova messages",
            titleEmpty: "Monthly Nova message quota used up",
            aria: (remaining: string, limit: string) =>
              `Messages remaining ${remaining} / ${limit}`,
          },
    [isTr],
  );

  const tone = quota ? getNovaQuotaTone(quota) : "ok";
  const ringPercent = quota ? getNovaQuotaRingPercent(quota) : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - ringPercent / 100);

  const ringColor =
    tone === "empty"
      ? "text-rose-400"
      : tone === "critical"
        ? "text-amber-400"
        : tone === "warn"
          ? "text-amber-300"
          : "text-[#d4a017]";

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(isTr ? "tr-TR" : "en-US"),
    [isTr],
  );

  const centerLabel = loading
    ? copy.loading
    : quota?.unlimited
      ? copy.unlimited
      : quota
        ? numberFormatter.format(quota.remaining)
        : "—";

  const title = quota
    ? quota.unlimited
      ? copy.titleUnlimited
      : quota.remaining <= 0
        ? copy.titleEmpty
        : copy.title(
            numberFormatter.format(quota.remaining),
            numberFormatter.format(quota.limit),
          )
    : isTr
      ? "Mesaj kotası yükleniyor"
      : "Loading message quota";

  const ringSize = compact ? 40 : 52;
  const centerTextClass = compact
    ? quota?.unlimited
      ? "text-base"
      : "text-[13px]"
    : quota?.unlimited
      ? "text-lg"
      : "text-[15px]";

  return (
    <div
      className={`flex flex-col items-center leading-none ${className}`}
      title={title}
      aria-label={
        quota && !quota.unlimited
          ? copy.aria(
              numberFormatter.format(quota.remaining),
              numberFormatter.format(quota.limit),
            )
          : title
      }
      role="status"
    >
      <div className="relative" style={{ width: ringSize, height: ringSize }}>
        <svg
          viewBox="0 0 36 36"
          className="-rotate-90"
          style={{ width: ringSize, height: ringSize }}
          aria-hidden
        >
          <circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            className={ringColor}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={loading ? RING_CIRCUMFERENCE * 0.25 : dashOffset}
            style={{ transition: "stroke-dashoffset 0.45s ease" }}
          />
        </svg>
        <div
          className={`absolute inset-0 flex items-center justify-center text-center font-bold tabular-nums leading-none text-white ${centerTextClass}`}
        >
          {centerLabel}
        </div>
      </div>
      <span
        className={
          compact
            ? "mt-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/45"
            : "mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/50"
        }
      >
        {copy.kalan}
      </span>
    </div>
  );
}
