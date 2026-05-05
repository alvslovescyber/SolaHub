import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchLanguageIndex, fetchSongSections } from '../languageSongs.service'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

// Minimal GitHub tree fixture — a few real-looking paths plus noise
const TREE_FIXTURE = {
  tree: [
    {
      path: 'txt/1 Aaradhikkuka ആരാധിക്കുക VV Malayalam 2021 1.txt',
      type: 'blob',
    },
    {
      path: 'txt/2 Njan Yesuvin ഞാൻ യേശുവിൻ VV Malayalam 2021 2.txt',
      type: 'blob',
    },
    {
      path: 'txt/1 Aaradhikka ஆராதிக்க VV Tamil 2021 1.txt',
      type: 'blob',
    },
    {
      path: 'txt/5 Yeshu Mera यीशु मेरा VV Hindi 2021 5.txt',
      type: 'blob',
    },
    // noise — should be ignored
    { path: 'README.md', type: 'blob' },
    { path: 'txt/', type: 'tree' },
    { path: 'txt/SomeFile NoMatch.txt', type: 'blob' },
  ],
}

describe('fetchLanguageIndex', () => {
  it('returns only songs matching the requested language', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(TREE_FIXTURE),
    })

    const songs = await fetchLanguageIndex('Malayalam')

    expect(songs).toHaveLength(2)
    expect(songs.every((s) => s.language === 'Malayalam')).toBe(true)
  })

  it('parses ids with language prefix and track number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(TREE_FIXTURE),
    })

    const songs = await fetchLanguageIndex('Malayalam')
    expect(songs[0].id).toBe('lang-malayalam-1')
    expect(songs[1].id).toBe('lang-malayalam-2')
  })

  it('splits English title from native title', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(TREE_FIXTURE),
    })

    const songs = await fetchLanguageIndex('Malayalam')
    const first = songs[0]
    expect(first.title).toBe('Aaradhikkuka')
    expect(first.nativeTitle).toBe('ആരാധിക്കുക')
  })

  it('returns Tamil and Hindi songs correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(TREE_FIXTURE),
    })
    const tamil = await fetchLanguageIndex('Tamil')
    expect(tamil).toHaveLength(1)
    expect(tamil[0].language).toBe('Tamil')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(TREE_FIXTURE),
    })
    const hindi = await fetchLanguageIndex('Hindi')
    expect(hindi).toHaveLength(1)
    expect(hindi[0].id).toBe('lang-hindi-5')
  })

  it('skips non-matching filenames silently', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ tree: [{ path: 'txt/SomeFile NoMatch.txt', type: 'blob' }] }),
    })

    const songs = await fetchLanguageIndex('Malayalam')
    expect(songs).toHaveLength(0)
  })

  it('throws when GitHub API returns a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 })
    await expect(fetchLanguageIndex('Malayalam')).rejects.toThrow('GitHub API error: 403')
  })
})

// Fixture simulating a VerseView .txt file with numbered verses and a chorus
const TXT_VERSE_CHORUS = `
Chorus line one
Chorus line two

1 Verse one line one
1 Verse one line two

2 Verse two line one
2 Verse two line two
`.trim()

// Fixture with native Malayalam script mixed with romanized labels
const TXT_NATIVE_ONLY = `
Chorus നിൻ ദൈവം

1 Verse ദൈവം ആണ്
`.trim()

describe('fetchSongSections', () => {
  it('parses a verse-chorus song into correct sections', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(TXT_VERSE_CHORUS),
    })

    const sections = await fetchSongSections('txt/1 Song Name VV Malayalam 2021 1.txt')

    const chorus = sections.find((s) => s.type === 'chorus')
    const verses = sections.filter((s) => s.type === 'verse')

    expect(chorus).toBeDefined()
    expect(chorus?.text).toContain('Chorus line one')
    expect(verses).toHaveLength(2)
    expect(verses[0].label).toBe('Verse 1')
    expect(verses[1].label).toBe('Verse 2')
  })

  it('does not duplicate repeated verses', async () => {
    const txtWithRepeat = `
Chorus line

1 First verse
1 First verse repeated
`.trim()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(txtWithRepeat),
    })

    const sections = await fetchSongSections('txt/1 Song VV Malayalam 2021 1.txt')
    const verses = sections.filter((s) => s.type === 'verse')
    expect(verses).toHaveLength(1)
  })

  it('only has one chorus even when the block appears multiple times', async () => {
    const txtMultiChorus = `
Chorus A

1 Verse one

Chorus B

2 Verse two
`.trim()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(txtMultiChorus),
    })

    const sections = await fetchSongSections('txt/1 Song VV Tamil 2021 1.txt')
    const choruses = sections.filter((s) => s.type === 'chorus')
    expect(choruses).toHaveLength(1)
  })

  it('treats unstructured plain text as a single chorus block', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('Just some plain text with no structure'),
    })

    const sections = await fetchSongSections('txt/1 Song VV Malayalam 2021 1.txt')
    // A single non-numbered block is classified as chorus (first non-numbered = chorus).
    expect(sections).toHaveLength(1)
    expect(sections[0].type).toBe('chorus')
    expect(sections[0].text).toContain('Just some plain text')
  })

  it('falls back to a single verse when content is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(''),
    })

    const sections = await fetchSongSections('txt/1 Song VV Malayalam 2021 1.txt')
    expect(sections).toHaveLength(1)
    expect(sections[0].type).toBe('verse')
  })

  it('parses native-script content correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(TXT_NATIVE_ONLY),
    })

    const sections = await fetchSongSections('txt/1 Song VV Malayalam 2021 1.txt')
    expect(sections.length).toBeGreaterThan(0)
  })

  it('throws when content fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    await expect(fetchSongSections('txt/1 Song VV Malayalam 2021 1.txt')).rejects.toThrow(
      'Failed to fetch song content: 404'
    )
  })

  it('URL-encodes the filename when fetching raw content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('Raw content'),
    })

    await fetchSongSections('txt/1 Song With Spaces VV Malayalam 2021 1.txt')

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('1%20Song%20With%20Spaces%20VV%20Malayalam%202021%201.txt')
  })
})
