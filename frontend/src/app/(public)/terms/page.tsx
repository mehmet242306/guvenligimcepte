import {
  LegalSectionsDocument,
  legalSectionsMetadata,
} from "@/components/legal/LegalStaticPages";

export async function generateMetadata() {
  return legalSectionsMetadata("terms", "/terms");
}

export default async function TermsPage() {
  return <LegalSectionsDocument docKey="terms" />;
}
