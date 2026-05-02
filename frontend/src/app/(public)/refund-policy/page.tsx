import {
  LegalParagraphsDocument,
  legalParagraphsMetadata,
} from "@/components/legal/LegalStaticPages";

export async function generateMetadata() {
  return legalParagraphsMetadata("legal.refund", "/refund-policy");
}

export default async function RefundPolicyPage() {
  return <LegalParagraphsDocument namespace="legal.refund" />;
}
