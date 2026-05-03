'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import { useTranslations } from 'next-intl';
import type { SharedDocumentView as SharedDocumentViewType } from './SharedDocumentView';

function SharedDocumentDynamicLoading() {
  const t = useTranslations('sharedDocument');
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>{t('loading')}</span>
      </div>
    </div>
  );
}

const SharedDocumentView = dynamic(
  () => import('./SharedDocumentView').then((m) => m.SharedDocumentView),
  {
    ssr: false,
    loading: () => <SharedDocumentDynamicLoading />,
  },
);

type Props = ComponentProps<typeof SharedDocumentViewType>;

export function SharedDocumentLoader(props: Props) {
  return <SharedDocumentView {...props} />;
}
