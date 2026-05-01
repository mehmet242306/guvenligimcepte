import { notFound } from "next/navigation";
import { loadEditorDocumentForShare } from "@/lib/documents/shared-document-load";
import { SharedDocumentLoader } from "./SharedDocumentLoader";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharedDocumentPage({ params }: Props) {
  const { token } = await params;
  const payload = await loadEditorDocumentForShare(token);

  if (!payload) {
    notFound();
  }

  return (
    <SharedDocumentLoader
      title={payload.title}
      contentJson={payload.contentJson}
      companyName={payload.companyName}
      status={payload.status}
      createdAt={payload.createdAt}
      signatures={payload.signatures}
    />
  );
}
