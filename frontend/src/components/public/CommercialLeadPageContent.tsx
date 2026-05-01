"use client";

import { RegisterCommercialPlans } from "@/components/auth/RegisterCommercialPlans";

export function CommercialLeadPageContent({
  mode,
}: {
  mode: "osgb" | "enterprise";
}) {
  return (
    <section className="border-b border-white/10 bg-[var(--navy-dark)] text-white">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-10 sm:px-6 lg:px-8">
        <RegisterCommercialPlans tone="dark" mode={mode} />
      </div>
    </section>
  );
}
