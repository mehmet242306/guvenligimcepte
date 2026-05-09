"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  FileDown,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  QrCode,
  Share2,
  X,
} from "lucide-react";
import { useLocale } from "next-intl";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";

interface AnalysisShareModalProps {
  open: boolean;
  onClose: () => void;
  url?: string | null;
  title?: string;
  shareText?: string;
  onDownloadPdf?: () => Promise<void> | void;
}

export function AnalysisShareModal({
  open,
  onClose,
  url,
  title,
  shareText,
  onDownloadPdf,
}: AnalysisShareModalProps) {
  const locale = useLocale();
  const isTr = locale === "tr";
  const copy = {
    defaultTitle: isTr ? "Analizi Paylas" : "Share analysis",
    subtitle: isTr ? "Link, QR kod veya dogrudan paylasim" : "Link, QR code, or direct share",
    close: isTr ? "Kapat" : "Close",
    qrAlt: isTr ? "Paylasim QR kodu" : "Share QR code",
    scanHint: isTr ? "Mobil ile tarayin - aninda erisim" : "Scan on mobile for instant access",
    shareLink: isTr ? "Paylasim Linki" : "Share link",
    copied: isTr ? "Kopyalandi" : "Copied",
    copy: isTr ? "Kopyala" : "Copy",
    copyLink: isTr ? "Linki kopyala" : "Copy link",
    share: isTr ? "Paylas" : "Share",
    email: isTr ? "E-posta" : "Email",
    newTab: isTr ? "Yeni sekme" : "New tab",
    pdfTitle: isTr ? "PDF olarak paylas" : "Share as PDF",
    pdfText: isTr
      ? "PDF dosyasinin altinda ayni QR kod ve paylasim linki gomuludur. Indirip mesajlasma uygulamanizdan, e-posta ile veya yazicidan basip dagitabilirsiniz."
      : "The same QR code and share link are embedded at the bottom of the PDF. Download it, send it by email or messaging app, or print and distribute it.",
    pdfBusy: isTr ? "PDF hazirlaniyor..." : "Preparing PDF...",
    pdfAction: isTr ? "PDF olarak Indir / Yazdir" : "Download / Print PDF",
    noteLabel: isTr ? "Not:" : "Note:",
    legalNote: isTr
      ? "Paylasilan link RiskNova platformuna yonlendirir. Erisim icin karsi tarafin yetkili kullanici olmasi gerekebilir. Hassas bilgi iceren analizleri yalnizca yetkilendirilmis kisilerle paylasin."
      : "The shared link opens RiskNova. The recipient may need an authorized account to access it. Share analyses containing sensitive information only with authorized people.",
  };
  const displayTitle = title ?? copy.defaultTitle;
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [hasNativeShare, setHasNativeShare] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const finalUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");
    setShareUrl(finalUrl);
    setHasNativeShare(typeof navigator !== "undefined" && "share" in navigator);

    if (finalUrl) {
      QRCode.toDataURL(finalUrl, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 240,
        color: { dark: "#0F172A", light: "#FFFFFF" },
      })
        .then(setQrDataUrl)
        .catch((error) => console.warn("QR generation failed:", error));
    }
  }, [open, url]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.warn("Clipboard API failed");
    }
  };

  const handleNativeShare = async () => {
    if (!("share" in navigator)) return;
    try {
      await navigator.share({
        title: displayTitle,
        text: shareText ?? displayTitle,
        url: shareUrl,
      });
    } catch {
      // User cancelled native share.
    }
  };

  const emailHref = `mailto:?subject=${encodeURIComponent(displayTitle)}&body=${encodeURIComponent(`${shareText ?? ""}\n\n${shareUrl}`)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText ?? displayTitle} - ${shareUrl}`)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/15">
              <Share2 className="size-5 text-primary" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">{displayTitle}</h3>
              <p className="text-xs text-muted-foreground">{copy.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={copy.close}
          >
            <X className="size-4" />
          </button>
        </div>

        {qrDataUrl && (
          <div className="mt-5 flex flex-col items-center gap-2">
            <div className="rounded-xl border border-border bg-white p-3">
              <img src={qrDataUrl} alt={copy.qrAlt} className="size-44" />
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <QrCode className="size-3" />
              {copy.scanHint}
            </p>
          </div>
        )}

        <div className="mt-4">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {copy.shareLink}
          </label>
          <div className="flex items-stretch gap-2">
            <div className="flex flex-1 items-center gap-2 overflow-hidden rounded-lg border border-border bg-muted/40 px-3 py-2">
              <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate font-mono text-xs text-foreground" title={shareUrl}>
                {shareUrl || "-"}
              </span>
            </div>
            <Button
              type="button"
              variant={copied ? "accent" : "outline"}
              size="sm"
              onClick={handleCopy}
              disabled={!shareUrl}
              aria-label={copied ? copy.copied : copy.copyLink}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? copy.copied : copy.copy}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {hasNativeShare && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleNativeShare}
              className="col-span-2 sm:col-span-1"
            >
              <Share2 className="size-4" /> {copy.share}
            </Button>
          )}
          <a
            href={emailHref}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            <Mail className="size-4" /> {copy.email}
          </a>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            <MessageCircle className="size-4" /> WhatsApp
          </a>
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            <ExternalLink className="size-4" /> {copy.newTab}
          </a>
        </div>

        {onDownloadPdf && (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-2">
              <FileDown className="size-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">{copy.pdfTitle}</span>
            </div>
            <p className="mb-3 text-[11px] leading-4 text-muted-foreground">{copy.pdfText}</p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={pdfBusy}
              className="w-full"
              onClick={async () => {
                setPdfBusy(true);
                try {
                  await onDownloadPdf();
                } finally {
                  setPdfBusy(false);
                }
              }}
            >
              {pdfBusy ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
              {pdfBusy ? copy.pdfBusy : copy.pdfAction}
            </Button>
          </div>
        )}

        <p className="mt-3 rounded-lg bg-amber-500/10 p-2.5 text-[10px] leading-4 text-amber-700 dark:text-amber-300">
          <strong>{copy.noteLabel}</strong> {copy.legalNote}
        </p>
      </div>
    </div>
  );
}
