import { DocumentEditorClient } from './DocumentEditorClient';

export default function DocumentEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <DocumentEditorClient paramsPromise={params} />;
}
