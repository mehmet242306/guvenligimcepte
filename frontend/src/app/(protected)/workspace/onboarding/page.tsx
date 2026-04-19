import { WorkspaceOnboardingClient } from "./WorkspaceOnboardingClient";

export default async function WorkspaceOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <WorkspaceOnboardingClient nextPath={params.next} />;
}
