import {
  LegalSectionsDocument,
  legalSectionsMetadata,
} from "@/components/legal/LegalStaticPages";

export async function generateMetadata() {
  return legalSectionsMetadata("cookiePolicy", "/cookie-policy");
}

export default async function CookiePolicyPage() {
  return <LegalSectionsDocument docKey="cookiePolicy" />;
}
