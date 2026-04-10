import { PresenterClient } from "./PresenterClient";

export default async function PresentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PresenterClient deckId={id} />;
}
