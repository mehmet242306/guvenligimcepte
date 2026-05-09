import { getLocale } from "next-intl/server";
import { WorkspaceOnboardingClient } from "./WorkspaceOnboardingClient";

export default async function WorkspaceOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; passwordUpdated?: string }>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const isTr = locale === "tr";
  return (
    <WorkspaceOnboardingClient
      nextPath={params.next}
      initialMessage={
        params.passwordUpdated === "1"
          ? isTr
            ? "Sifren kaydedildi. Devam etmek icin ulke ve rol secimini tamamla."
            : "Your password has been saved. Complete your country and role selection to continue."
          : undefined
      }
    />
  );
}
