'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { EditorToolbar } from './EditorToolbar';
import type { JSONContent } from '@tiptap/react';

interface TipTapEditorProps {
  content?: JSONContent;
  onChange?: (json: JSONContent) => void;
  placeholder?: string;
  editable?: boolean;
}

export function TipTapEditor({
  content,
  onChange,
  placeholder = 'Doküman içeriğini yazın veya şablondan başlayın...',
  editable = true,
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
    ],
    content: content || undefined,
    editable,
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base max-w-none dark:prose-invert focus:outline-none min-h-[400px] px-6 py-4',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-[var(--card-border)] rounded-xl overflow-hidden bg-white dark:bg-[#1e293b]">
      <EditorToolbar editor={editor} />
      <div className="overflow-auto max-h-[70vh]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default TipTapEditor;
