import {
  LegalParagraphsDocument,
  legalParagraphsMetadata,
} from "@/components/legal/LegalStaticPages";

export async function generateMetadata() {
  return legalParagraphsMetadata("legal.termsSummary", "/terms-and-conditions");
}

export default async function TermsAndConditionsPage() {
  return <LegalParagraphsDocument namespace="legal.termsSummary" />;
}
