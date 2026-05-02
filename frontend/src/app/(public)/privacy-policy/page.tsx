import { PublicHeader } from "@/components/layout/public-header";
import { PublicLegalFooter } from "@/components/layout/public-legal-footer";

export default async function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicHeader />
      <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase text-amber-700">
          Privacy policy
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          RiskNova Privacy Policy
        </h1>
        <div className="mt-8 space-y-6 text-base leading-8 text-muted-foreground">
          <p>
            RiskNova collects account, workspace, billing, and product usage
            information needed to provide occupational health and safety
            software services.
          </p>
          <p>
            We use this information to authenticate users, provide subscribed
            features, process payments, support customers, improve the product,
            and maintain security. Payment processing is handled by Paddle;
            RiskNova does not store full card details.
          </p>
          <p>
            Users may upload workplace safety content such as risk analysis
            information, documents, training materials, and inspection notes.
            This content is used to provide the requested product features and
            is not sold to third parties.
          </p>
          <p>
            We use trusted service providers for hosting, authentication,
            analytics, AI processing, email, and billing. These providers may
            process data only as necessary to deliver the service.
          </p>
          <p>
            Users can request access, correction, export, or deletion of their
            personal data subject to legal, security, and operational retention
            requirements.
          </p>
          <p>
            For privacy questions or data requests, contact us through the
            contact channels listed on the RiskNova website.
          </p>
        </div>
      </section>
      <PublicLegalFooter />
    </main>
  );
}
