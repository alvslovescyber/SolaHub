import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getStorageItem, writeJsonStorage } from '@/lib/safeStorage'
import { useLanguageSongsStore } from '@/stores/languageSongs.store'

export interface SongSection {
  type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro'
  label: string
  text: string
}

export interface Song {
  id: string
  title: string
  nativeTitle?: string
  author?: string
  year?: number
  isCustom?: boolean
  sections: SongSection[]
}

const BUILT_IN_SONGS: Song[] = [
  {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    author: 'John Newton',
    year: 1779,
    sections: [
      {
        type: 'verse',
        label: 'Verse 1',
        text: 'Amazing grace! How sweet the sound\nThat saved a wretch like me!\nI once was lost, but now am found;\nWas blind, but now I see.',
      },
      {
        type: 'verse',
        label: 'Verse 2',
        text: "'Twas grace that taught my heart to fear,\nAnd grace my fears relieved;\nHow precious did that grace appear\nThe hour I first believed.",
      },
      {
        type: 'verse',
        label: 'Verse 3',
        text: "Through many dangers, toils and snares\nI have already come;\n'Tis grace has brought me safe thus far,\nAnd grace will lead me home.",
      },
      {
        type: 'verse',
        label: 'Verse 4',
        text: 'The Lord has promised good to me,\nHis Word my hope secures;\nHe will my shield and portion be\nAs long as life endures.',
      },
      {
        type: 'verse',
        label: 'Verse 5',
        text: "When we've been there ten thousand years,\nBright shining as the sun,\nWe've no less days to sing God's praise\nThan when we'd first begun.",
      },
    ],
  },
  {
    id: 'holy-holy-holy',
    title: 'Holy, Holy, Holy',
    author: 'Reginald Heber',
    year: 1826,
    sections: [
      {
        type: 'verse',
        label: 'Verse 1',
        text: 'Holy, holy, holy! Lord God Almighty!\nEarly in the morning our song shall rise to Thee;\nHoly, holy, holy! Merciful and mighty!\nGod in three Persons, blessèd Trinity!',
      },
      {
        type: 'verse',
        label: 'Verse 2',
        text: 'Holy, holy, holy! All the saints adore Thee,\nCasting down their golden crowns around the glassy sea;\nCherubim and seraphim falling down before Thee,\nWho wert, and art, and evermore shalt be.',
      },
      {
        type: 'verse',
        label: 'Verse 3',
        text: 'Holy, holy, holy! Though the darkness hide Thee,\nThough the eye of sinful man Thy glory may not see;\nOnly Thou art holy; there is none beside Thee,\nPerfect in power, in love, and purity.',
      },
      {
        type: 'verse',
        label: 'Verse 4',
        text: 'Holy, holy, holy! Lord God Almighty!\nAll Thy works shall praise Thy name, in earth, and sky, and sea;\nHoly, holy, holy! Merciful and mighty!\nGod in three Persons, blessèd Trinity!',
      },
    ],
  },
  {
    id: 'it-is-well',
    title: 'It Is Well with My Soul',
    author: 'Horatio Spafford',
    year: 1873,
    sections: [
      {
        type: 'verse',
        label: 'Verse 1',
        text: 'When peace like a river attendeth my way,\nWhen sorrows like sea billows roll;\nWhatever my lot, Thou hast taught me to say,\nIt is well, it is well with my soul.',
      },
      {
        type: 'chorus',
        label: 'Chorus',
        text: 'It is well with my soul,\nIt is well, it is well with my soul.',
      },
      {
        type: 'verse',
        label: 'Verse 2',
        text: 'Though Satan should buffet, though trials should come,\nLet this blest assurance control;\nThat Christ hath regarded my helpless estate,\nAnd hath shed His own blood for my soul.',
      },
      {
        type: 'verse',
        label: 'Verse 3',
        text: 'My sin—oh, the bliss of this glorious thought!\nMy sin, not in part but the whole,\nIs nailed to the cross, and I bear it no more,\nPraise the Lord, praise the Lord, O my soul!',
      },
      {
        type: 'verse',
        label: 'Verse 4',
        text: 'And Lord, haste the day when the faith shall be sight,\nThe clouds be rolled back as a scroll;\nThe trump shall resound, and the Lord shall descend,\nEven so, it is well with my soul.',
      },
    ],
  },
  {
    id: 'blessed-assurance',
    title: 'Blessed Assurance',
    author: 'Fanny Crosby',
    year: 1873,
    sections: [
      {
        type: 'verse',
        label: 'Verse 1',
        text: 'Blessed assurance, Jesus is mine!\nOh, what a foretaste of glory divine!\nHeir of salvation, purchase of God,\nBorn of His Spirit, washed in His blood.',
      },
      {
        type: 'chorus',
        label: 'Chorus',
        text: 'This is my story, this is my song,\nPraising my Savior all the day long;\nThis is my story, this is my song,\nPraising my Savior all the day long.',
      },
      {
        type: 'verse',
        label: 'Verse 2',
        text: 'Perfect submission, perfect delight,\nVisions of rapture now burst on my sight;\nAngels descending bring from above\nEchoes of mercy, whispers of love.',
      },
      {
        type: 'verse',
        label: 'Verse 3',
        text: 'Perfect submission, all is at rest,\nI in my Savior am happy and blest;\nWatching and waiting, looking above,\nFilled with His goodness, lost in His love.',
      },
    ],
  },
  {
    id: 'to-god-be-the-glory',
    title: 'To God Be the Glory',
    author: 'Fanny Crosby',
    year: 1875,
    sections: [
      {
        type: 'verse',
        label: 'Verse 1',
        text: 'To God be the glory, great things He hath taught us,\nGreat things He hath done, and great our rejoicing\nThrough Jesus the Son;\nBut purer, and higher, and greater will be\nOur wonder, our transport, when Jesus we see.',
      },
      {
        type: 'chorus',
        label: 'Chorus',
        text: 'Praise the Lord! Praise the Lord!\nLet the earth hear His voice!\nPraise the Lord! Praise the Lord!\nLet the people rejoice!\nOh, come to the Father, through Jesus the Son,\nAnd give Him the glory; great things He hath done.',
      },
      {
        type: 'verse',
        label: 'Verse 2',
        text: 'Oh, perfect redemption, the purchase of blood,\nTo every believer the promise of God;\nThe vilest offender who truly believes,\nThat moment from Jesus a pardon receives.',
      },
      {
        type: 'verse',
        label: 'Verse 3',
        text: 'Great things He hath taught us, great things He hath done,\nAnd great our rejoicing through Jesus the Son;\nBut purer, and higher, and greater will be\nOur wonder, our transport, when Jesus we see.',
      },
    ],
  },
]

const STORAGE_KEY = 'solahub:custom-songs'
const EDITS_STORAGE_KEY = 'solahub:song-edits'
type EditableSong = Omit<Song, 'id' | 'isCustom'>

export const useSongsStore = defineStore('songs', () => {
  function loadCustom(): Song[] {
    try {
      const raw = getStorageItem(STORAGE_KEY)
      const parsed: unknown = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed.map(normalizeCustomSong).filter(isSong) : []
    } catch {
      return []
    }
  }

  function loadEdits(): Record<string, EditableSong> {
    try {
      const raw = getStorageItem(EDITS_STORAGE_KEY)
      const parsed: unknown = raw ? JSON.parse(raw) : {}
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

      const builtInIds = new Set(BUILT_IN_SONGS.map((song) => song.id))
      return Object.fromEntries(
        Object.entries(parsed)
          .filter(([id]) => builtInIds.has(id))
          .map(([id, value]) => [id, normalizeEditableSong(value)])
          .filter((entry): entry is [string, EditableSong] => entry[1] !== null)
      )
    } catch {
      return {}
    }
  }

  const customSongs = ref<Song[]>(loadCustom())
  const songEdits = ref<Record<string, EditableSong>>(loadEdits())
  const languageSongsStore = useLanguageSongsStore()
  const allSongs = computed<Song[]>(() => [
    ...BUILT_IN_SONGS.map((song) => {
      const edit = songEdits.value[song.id]
      return edit
        ? { ...song, ...edit, sections: edit.sections.map((section) => ({ ...section })) }
        : song
    }),
    ...customSongs.value,
    ...languageSongsStore.allLanguageSongs,
  ])

  function addSong(song: EditableSong): void {
    const id = `custom-${crypto.randomUUID()}`
    customSongs.value = [...customSongs.value, { ...cloneEditableSong(song), id, isCustom: true }]
    persist()
  }

  function updateSong(id: string, song: EditableSong): void {
    const next = cloneEditableSong(song)
    if (customSongs.value.some((s) => s.id === id)) {
      customSongs.value = customSongs.value.map((s) =>
        s.id === id ? { ...next, id, isCustom: true } : s
      )
    } else if (BUILT_IN_SONGS.some((s) => s.id === id)) {
      songEdits.value = { ...songEdits.value, [id]: next }
    }
    persist()
  }

  function removeSong(id: string): void {
    customSongs.value = customSongs.value.filter((s) => s.id !== id)
    persist()
  }

  function persist(): void {
    writeJsonStorage(STORAGE_KEY, customSongs.value)
    writeJsonStorage(EDITS_STORAGE_KEY, songEdits.value)
  }

  return { customSongs, songEdits, allSongs, addSong, updateSong, removeSong }
})

function cloneEditableSong(song: EditableSong): EditableSong {
  return {
    title: song.title.trim(),
    author: song.author?.trim() || undefined,
    year: song.year,
    sections: song.sections.map((section) => ({
      type: section.type,
      label: section.label.trim(),
      text: section.text.trim(),
    })),
  }
}

const SECTION_TYPES: SongSection['type'][] = ['verse', 'chorus', 'bridge', 'intro', 'outro']

function isSectionType(value: unknown): value is SongSection['type'] {
  return typeof value === 'string' && SECTION_TYPES.includes(value as SongSection['type'])
}

function normalizeSection(value: unknown): SongSection | null {
  if (!value || typeof value !== 'object') return null
  const section = value as Partial<Record<keyof SongSection, unknown>>
  const text = typeof section.text === 'string' ? section.text.trim() : ''
  if (!text) return null

  const label = typeof section.label === 'string' ? section.label.trim() : ''
  return {
    type: isSectionType(section.type) ? section.type : 'verse',
    label: label || 'Verse',
    text,
  }
}

function normalizeEditableSong(value: unknown): EditableSong | null {
  if (!value || typeof value !== 'object') return null
  const song = value as Partial<Record<keyof EditableSong, unknown>>
  const title = typeof song.title === 'string' ? song.title.trim() : ''
  if (!title) return null

  const sections = Array.isArray(song.sections)
    ? song.sections.map(normalizeSection).filter((section): section is SongSection => !!section)
    : []
  if (sections.length === 0) return null

  const author = typeof song.author === 'string' ? song.author.trim() : ''
  const year =
    typeof song.year === 'number' && Number.isInteger(song.year) && song.year > 0
      ? song.year
      : undefined

  return {
    title,
    author: author || undefined,
    year,
    sections,
  }
}

function normalizeCustomSong(value: unknown): Song | null {
  if (!value || typeof value !== 'object') return null
  const song = value as Partial<Record<keyof Song, unknown>>
  if (typeof song.id !== 'string' || !song.id.startsWith('custom-')) return null

  const editable = normalizeEditableSong(value)
  return editable ? { ...editable, id: song.id, isCustom: true } : null
}

function isSong(song: Song | null): song is Song {
  return song !== null
}
