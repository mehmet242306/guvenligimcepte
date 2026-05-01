"use client";

import { RegisterCommercialPlans } from "@/components/auth/RegisterCommercialPlans";

export function CommercialLeadPageContent({
  mode,
  sectionId,
}: {
  mode: "osgb" | "enterprise";
  /** Hero CTA #anchor ile forma kaydirma */
  sectionId?: string;
}) {
  const leadSourcePage =
    mode === "enterprise" ? "cozumler_kurumsal" : "cozumler_osgb";

  return (
    <section
      id={sectionId}
      className="scroll-mt-[72px] border-b border-white/10 bg-[var(--navy-dark)] text-white"
    >
      <div className="mx-auto w-full max-w-[1240px] px-4 py-10 sm:px-6 lg:px-8">
        <RegisterCommercialPlans tone="dark" mode={mode} leadSourcePage={leadSourcePage} />
      </div>
    </section>
  );
}
