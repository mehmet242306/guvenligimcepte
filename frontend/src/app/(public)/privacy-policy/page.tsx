import {
  LegalParagraphsDocument,
  legalParagraphsMetadata,
} from "@/components/legal/LegalStaticPages";

export async function generateMetadata() {
  return legalParagraphsMetadata("legal.privacySummary", "/privacy-policy");
}

export default async function PrivacyPolicyPage() {
  return <LegalParagraphsDocument namespace="legal.privacySummary" />;
}
