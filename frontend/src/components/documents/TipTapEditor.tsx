'use client';

import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';

interface TipTapEditorProps {
  editor: Editor | null;
}

export function TipTapEditor({ editor }: TipTapEditorProps) {
  if (!editor) return null;

  return <EditorContent editor={editor} />;
}

export default TipTapEditor;
