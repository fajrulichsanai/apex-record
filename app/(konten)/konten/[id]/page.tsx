'use client';

import StoryEditor from '@/components/konten/StoryEditor';

/** /konten/baru (optionally ?template=<id>) and /konten/<id>: one story. */
export default function KontenEditorPage() {
  return <StoryEditor mode="content" />;
}
