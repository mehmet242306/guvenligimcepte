import { PublicHeader } from "@/components/layout/public-header";
import { PublicLegalFooter } from "@/components/layout/public-legal-footer";

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicHeader />
      <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase text-amber-700">
          Terms of service
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          RiskNova Terms and Conditions
        </h1>
        <div className="mt-8 space-y-6 text-base leading-8 text-muted-foreground">
          <p>
            RiskNova is a subscription-based SaaS platform for occupational
            health and safety professionals. By creating an account or using
            RiskNova, you agree to use the service only for lawful professional
            safety, documentation, analysis, and workflow management purposes.
          </p>
          <p>
            Individual plans are intended for self-service professional use.
            OSGB and corporate use cases may require a separate commercial
            agreement and onboarding process.
          </p>
          <p>
            RiskNova may include AI-assisted analysis and document generation.
            Users remain responsible for reviewing outputs, applying their own
            professional judgment, and complying with applicable laws,
            standards, and workplace procedures.
          </p>
          <p>
            Subscription access, limits, billing cycles, and available features
            are shown on the pricing page before checkout. We may update plans
            or features over time, but active subscriptions will continue under
            the terms presented at purchase unless otherwise communicated.
          </p>
          <p>
            Users must not misuse the service, attempt unauthorized access,
            upload unlawful content, or use RiskNova to replace required legal,
            medical, engineering, or regulatory professional review.
          </p>
          <p>
            For questions about these terms, contact us through the contact
            channels listed on the RiskNova website.
          </p>
        </div>
      </section>
      <PublicLegalFooter />
    </main>
  );
}
