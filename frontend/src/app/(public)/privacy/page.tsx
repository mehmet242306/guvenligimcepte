import {
  LegalSectionsDocument,
  legalSectionsMetadata,
} from "@/components/legal/LegalStaticPages";

export async function generateMetadata() {
  return legalSectionsMetadata("privacy", "/privacy");
}

export default async function PrivacyPage() {
  return <LegalSectionsDocument docKey="privacy" />;
}
