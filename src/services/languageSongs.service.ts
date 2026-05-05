import type { SongSection } from '@/stores/songs.store'

export type SupportedLanguage = 'Malayalam' | 'Tamil' | 'Hindi'

export interface LanguageSongMeta {
  id: string
  title: string
  nativeTitle: string
  language: SupportedLanguage
  filePath: string
}

const GITHUB_API = 'https://api.github.com'
const GITHUB_RAW = 'https://raw.githubusercontent.com'
const REPO = 'bibintomj/verseview-to-propresenter'
const BRANCH = 'main'

// Native Unicode ranges: Devanagari (Hindi), Malayalam, Tamil
const NATIVE_SCRIPT_RE = /[ऀ-ॿഀ-ൿ஀-௿]/

export async function fetchLanguageIndex(language: SupportedLanguage): Promise<LanguageSongMeta[]> {
  const res = await fetch(`${GITHUB_API}/repos/${REPO}/git/trees/HEAD?recursive=1`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)

  const data = (await res.json()) as { tree: Array<{ path: string; type: string }> }

  return data.tree
    .filter(
      (item) =>
        item.type === 'blob' && item.path.startsWith('txt/') && item.path.includes(`VV ${language}`)
    )
    .map((item) => parseSongFilename(item.path))
    .filter((m): m is LanguageSongMeta => m !== null)
}

function parseSongFilename(filePath: string): LanguageSongMeta | null {
  const filename = filePath.slice(4).replace(/\.txt$/, '') // strip "txt/"

  const match = filename.match(/^(\d+)\s+(.+?)\s+VV\s+(Malayalam|Tamil|Hindi)\s+\d{4}\s+(\d+)$/)
  if (!match) return null

  const fullTitle = match[2].trim()
  const nativeSplitIdx = fullTitle.search(NATIVE_SCRIPT_RE)

  const title = nativeSplitIdx > 0 ? fullTitle.slice(0, nativeSplitIdx).trim() : fullTitle
  const nativeTitle = nativeSplitIdx > 0 ? fullTitle.slice(nativeSplitIdx).trim() : ''

  return {
    id: `lang-${match[3].toLowerCase()}-${match[4]}`,
    title: title || fullTitle,
    nativeTitle,
    language: match[3] as SupportedLanguage,
    filePath,
  }
}

export async function fetchSongSections(filePath: string): Promise<SongSection[]> {
  const filename = filePath.slice(4) // strip "txt/"
  const url = `${GITHUB_RAW}/${REPO}/${BRANCH}/txt/${encodeURIComponent(filename)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch song content: ${res.status}`)
  const text = await res.text()
  return parseTxtContent(text)
}

function parseTxtContent(text: string): SongSection[] {
  const lines = text.split('\n')
  const blocks: string[][] = []
  let current: string[] = []

  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length > 0) {
        blocks.push(current)
        current = []
      }
    } else {
      current.push(line.trim())
    }
  }
  if (current.length > 0) blocks.push(current)

  const hasAnyNative = blocks.some((b) => b.some((l) => NATIVE_SCRIPT_RE.test(l)))
  const isNativeLine = (l: string) => !hasAnyNative || NATIVE_SCRIPT_RE.test(l)

  const sections: SongSection[] = []
  const versesSeen = new Set<number>()
  let chorusDone = false

  for (const block of blocks) {
    if (block.length === 0) continue
    const verseMatch = block[0].match(/^(\d+)\s/)

    if (verseMatch) {
      const n = parseInt(verseMatch[1])
      if (versesSeen.has(n)) continue
      if (!block.some(isNativeLine)) continue
      versesSeen.add(n)

      const lines = block
        .map((l) => l.replace(/^\d+\s+/, ''))
        .filter(isNativeLine)
        .filter(Boolean)

      if (lines.length > 0) {
        sections.push({ type: 'verse', label: `Verse ${n}`, text: lines.join('\n') })
      }
    } else if (!chorusDone) {
      const chorusLines = block.filter(isNativeLine)
      if (chorusLines.length > 0) {
        chorusDone = true
        sections.push({ type: 'chorus', label: 'Chorus', text: chorusLines.join('\n') })
      }
    }
  }

  return sections.length > 0 ? sections : [{ type: 'verse', label: 'Verse 1', text: text.trim() }]
}
