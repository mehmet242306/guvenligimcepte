import { SlideEditorClient } from "./SlideEditorClient";

export default async function SlideEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SlideEditorClient deckId={id} />;
}
