import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicLegalFooter } from "@/components/layout/public-legal-footer";

export const metadata: Metadata = {
  title: "Account and Data Deletion Request",
  description:
    "Steps for requesting deletion of your RiskNova account and related personal data.",
  alternates: { canonical: "/delete-account" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "RiskNova Account and Data Deletion Request",
    description:
      "Steps for requesting deletion of your RiskNova account and related personal data.",
    type: "article",
    url: "/delete-account",
  },
};

const steps = [
  "Sign in with your RiskNova account.",
  "Go to the Privacy and Consents tab on the Profile page.",
  "Enter your request reason in the Delete My Data section.",
  "Submit your request with the create deletion request button.",
];

export default function DeleteAccountPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <section className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase text-amber-700">RiskNova Data Rights</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          Account and Data Deletion Request
        </h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground">
          RiskNova users can request deletion of their account and related personal data
          from inside the application. After a request is created, the deletion process is
          handled according to administrative review and retention policies.
        </p>

        <section className="mt-10 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Request Deletion In The App
          </h2>
          <ol className="mt-5 space-y-3 text-base leading-7 text-muted-foreground">
            {steps.map((step) => (
              <li key={step} className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-amber-600" aria-hidden="true" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <Link
            href="/profile"
            className="mt-6 inline-flex rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Go to profile
          </Link>
        </section>

        <section className="mt-8 space-y-4 text-base leading-8 text-muted-foreground">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Deleted and Retained Data
          </h2>
          <p>
            A deletion request is evaluated for profile information, application records,
            uploaded files, and account-related transaction data. Data that must be retained
            for legal obligations, security logs, billing, or dispute resolution may be kept
            for a limited period under applicable regulations and retention policies.
          </p>
          <p>
            If you cannot access your account or need help with a deletion request, contact us at{" "}
            <a
              href="mailto:mehmet242306@gmail.com"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              mehmet242306@gmail.com
            </a>.
          </p>
          <p>
            For more information about our privacy practices, review the{" "}
            <Link href="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
              Privacy Policy
            </Link>.
          </p>
        </section>
      </section>
      <PublicLegalFooter />
    </main>
  );
}
