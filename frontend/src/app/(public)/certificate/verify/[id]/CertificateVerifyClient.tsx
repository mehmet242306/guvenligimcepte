"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { verifyCertificateByQr, type CertificateRecord } from "@/lib/supabase/certificate-api";

function intlLocale(locale: string): string {
  if (locale === "zh") return "zh-CN";
  return locale;
}

export function CertificateVerifyClient() {
  const params = useParams();
  const qrCode = params.id as string;
  const t = useTranslations("certificateVerify");
  const locale = useLocale();

  const [cert, setCert] = useState<CertificateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await verifyCertificateByQr(qrCode);
    if (result) {
      setCert(result);
    } else {
      setNotFound(true);
    }
    setLoading(false);
  }, [qrCode]);

  useEffect(() => { load(); }, [load]);

  const loc = intlLocale(locale);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#b8860b] border-t-transparent" />
          <p className="text-gray-500">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{t("notFoundTitle")}</h2>
          <p className="mt-2 text-gray-500">{t("notFoundDesc")}</p>
        </div>
      </div>
    );
  }

  const isExpired = cert?.validUntil && new Date(cert.validUntil) < new Date();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
            isExpired ? "bg-amber-100" : "bg-emerald-100"
          }`}>
            {isExpired ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {isExpired ? t("expiredCertTitle") : t("verifiedTitle")}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {isExpired ? t("expiredCertSubtitle") : t("verifiedSubtitle")}
          </p>
        </div>

        <div className="space-y-3 rounded-xl bg-gray-50 p-5">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">{t("certNo")}</span>
            <span className="text-sm font-medium text-gray-900">{cert?.certificateNo}</span>
          </div>
          <div className="border-t border-gray-200" />
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">{t("fullName")}</span>
            <span className="text-sm font-medium text-gray-900">{cert?.personName}</span>
          </div>
          <div className="border-t border-gray-200" />
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">{t("training")}</span>
            <span className="text-sm font-medium text-gray-900">{cert?.trainingName}</span>
          </div>
          {cert?.trainingDate && (
            <>
              <div className="border-t border-gray-200" />
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t("date")}</span>
                <span className="text-sm font-medium text-gray-900">{new Date(cert.trainingDate).toLocaleDateString(loc)}</span>
              </div>
            </>
          )}
          {cert?.trainingDuration && (
            <>
              <div className="border-t border-gray-200" />
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t("duration")}</span>
                <span className="text-sm font-medium text-gray-900">{cert.trainingDuration}</span>
              </div>
            </>
          )}
          {cert?.score !== null && cert?.score !== undefined && (
            <>
              <div className="border-t border-gray-200" />
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t("score")}</span>
                <span className="text-sm font-medium text-gray-900">{`${cert.score}%`}</span>
              </div>
            </>
          )}
          {cert?.trainerName && (
            <>
              <div className="border-t border-gray-200" />
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t("trainer")}</span>
                <span className="text-sm font-medium text-gray-900">{cert.trainerName}</span>
              </div>
            </>
          )}
          {cert?.companyName && (
            <>
              <div className="border-t border-gray-200" />
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t("institution")}</span>
                <span className="text-sm font-medium text-gray-900">{cert.companyName}</span>
              </div>
            </>
          )}
          <div className="border-t border-gray-200" />
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">{t("issuedAt")}</span>
            <span className="text-sm font-medium text-gray-900">{new Date(cert!.issuedAt).toLocaleDateString(loc)}</span>
          </div>
          {cert?.validUntil && (
            <>
              <div className="border-t border-gray-200" />
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t("validUntil")}</span>
                <span className={`text-sm font-medium ${isExpired ? "text-red-600" : "text-gray-900"}`}>
                  {new Date(cert.validUntil).toLocaleDateString(loc)}
                  {isExpired ? t("expiredSuffix") : ""}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">{t("footer")}</p>
        </div>
      </div>
    </div>
  );
}
