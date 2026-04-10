import { DeckAnalyticsClient } from "./DeckAnalyticsClient";

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DeckAnalyticsClient deckId={id} />;
}
