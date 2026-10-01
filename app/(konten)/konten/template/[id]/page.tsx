'use client';

import StoryEditor from '@/components/konten/StoryEditor';

/** /konten/template/baru (optionally ?preset=<example>) and /konten/template/<id>. */
export default function KontenTemplatePage() {
  return <StoryEditor mode="template" />;
}
