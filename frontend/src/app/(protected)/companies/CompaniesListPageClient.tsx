"use client";

import dynamic from "next/dynamic";

const CompaniesListClientNoSSR = dynamic(
  () => import("./CompaniesListClient").then((mod) => mod.CompaniesListClient),
  { ssr: false },
);

export function CompaniesListPageClient() {
  return <CompaniesListClientNoSSR />;
}
