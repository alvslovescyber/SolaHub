/** Translation ids accepted by bible-api.com (web) and passed through to Tauri invocations. */
export interface BibleTranslationMeta {
  id: string
  name: string
  language: string
  notes?: string
}

/** Curated list — extend as your API / bundles support more texts. */
export const BIBLE_TRANSLATION_CATALOG: BibleTranslationMeta[] = [
  { id: 'kjv', name: 'King James Version', language: 'English' },
  { id: 'web', name: 'World English Bible', language: 'English', notes: 'Public domain' },
  { id: 'asv', name: 'American Standard Version (1901)', language: 'English' },
  { id: 'bbe', name: 'Bible in Basic English', language: 'English' },
  { id: 'darby', name: 'Darby Translation', language: 'English' },
  { id: 'ylt', name: "Young's Literal Translation", language: 'English' },
  { id: 'oeb-us', name: 'Open English Bible (US)', language: 'English' },
  { id: 'clementine', name: 'Clementine Latin Vulgate', language: 'Latin' },
]

export function catalogMeta(id: string): BibleTranslationMeta | undefined {
  return BIBLE_TRANSLATION_CATALOG.find((t) => t.id === id.toLowerCase())
}
