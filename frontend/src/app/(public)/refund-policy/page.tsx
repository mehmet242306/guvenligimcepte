import { PublicHeader } from "@/components/layout/public-header";
import { PublicLegalFooter } from "@/components/layout/public-legal-footer";

export default async function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicHeader />
      <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase text-amber-700">
          Refund policy
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          RiskNova Refund Policy
        </h1>
        <div className="mt-8 space-y-6 text-base leading-8 text-muted-foreground">
          <p>
            RiskNova subscriptions are billed monthly or annually according to
            the plan selected at checkout.
          </p>
          <p>
            Customers may request a refund within 14 days of the initial
            purchase if the service has not been materially used and the request
            is not abusive or fraudulent.
          </p>
          <p>
            Renewal payments are generally non-refundable once a new billing
            period has started. Customers can cancel future renewals from their
            account or by contacting support.
          </p>
          <p>
            If a billing error, duplicate charge, or unauthorized transaction is
            confirmed, we will work with Paddle to correct the issue.
          </p>
          <p>
            Refund decisions may depend on usage, subscription type, legal
            requirements, and Paddle billing rules. Approved refunds are
            returned to the original payment method through Paddle.
          </p>
          <p>
            For refund requests, contact us through the contact channels listed
            on the RiskNova website and include the account email and order
            details.
          </p>
        </div>
      </section>
      <PublicLegalFooter />
    </main>
  );
}
