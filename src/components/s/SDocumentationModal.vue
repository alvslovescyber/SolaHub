<script setup lang="ts">
  import { type Component, ref, computed, onMounted, onBeforeUnmount } from 'vue'
  import { BookOpenText, CalendarDays, StickyNote, Monitor, HelpCircle, X } from 'lucide-vue-next'
  import SBrandMark from './SBrandMark.vue'

  defineProps<{ open: boolean }>()
  const emit = defineEmits<{ close: [] }>()

  type Article = { id: string; title: string; content: string }
  type Section = { id: string; label: string; icon: Component; articles: Article[] }
  type InlineSegment = { text: string; strong: boolean }
  type ContentBlock = {
    type: 'heading' | 'label' | 'bullet' | 'paragraph'
    text?: string
    segments?: InlineSegment[]
  }

  const sections: Section[] = [
    {
      id: 'getting-started',
      label: 'Getting Started',
      icon: HelpCircle,
      articles: [
        {
          id: 'quickstart',
          title: 'Quick start guide',
          content: `## Quick Start

SolaHub is a Christian digital study environment for individuals and churches. Here's how to get going in under five minutes.

**1. Open the Bible**
Click Bible in the left sidebar to open the Scripture reader. Navigate to any book and chapter using the controls at the top.

**2. Create a reading plan**
Click Plans in the sidebar, then New Plan. Add a title, build out your daily reading schedule, and publish it when ready.

**3. Write verse notes**
Click Notes in the sidebar to open your journal. Notes are linked to specific Bible verses and can be organized with tags.

**4. Set up the Presenter**
Click Presenter to open the Sunday presentation tool. Connect a second display in your system settings and use the slide builder to prepare your service.`,
        },
        {
          id: 'profile',
          title: 'Setting up your profile',
          content: `## Your Profile

Your profile lets your church community recognize you within shared plans and notes.

**Display name**
Set your display name in Settings → Profile. This name is shown to other members in shared reading plans and community notes.

**Email & password**
From Settings you can update your email address and change your password at any time.

**Church membership**
If your church administrator has set up a church account, you can join it from the Community view to access shared plans and notes.`,
        },
        {
          id: 'navigation',
          title: 'Navigating the app',
          content: `## Navigation

The left sidebar is divided into three sections.

**Study**
- Dashboard — your home screen with reading stats, today's plan, and quick access shortcuts
- Calendar — view your full reading schedule laid out by date

**Scripture**
- Bible — the full Scripture reader with search and navigation
- Plans — create, manage, and track reading plans
- Notes — your personal verse journal

**Sunday**
- Presenter — the live Sunday presentation and slide builder
- Community — your church network, shared plans, and community notes`,
        },
      ],
    },
    {
      id: 'bible',
      label: 'Bible',
      icon: BookOpenText,
      articles: [
        {
          id: 'read',
          title: 'Reading Scripture',
          content: `## Reading Scripture

The Bible view gives you access to the full text of Scripture.

**Navigating books and chapters**
Use the book selector at the top of the reader to jump to any book. Navigate chapters using the arrow controls or by clicking the chapter number directly.

**Verse display**
Verses are displayed with their reference numbers inline. Click any verse to see options such as adding a note or copying the reference.

**Translation**
SolaHub ships with the King James Version (KJV) built in. The translation is stored locally so the Bible works fully offline.`,
        },
        {
          id: 'search',
          title: 'Searching passages',
          content: `## Searching Passages

**Full-text search**
Use the search bar at the top of the Bible view to search for any word or phrase across the entire Scripture.

**Reading results**
Results show the verse reference alongside a text excerpt in context. Click any result to jump directly to that verse in the reader.

**Search tips**
- Search for multi-word phrases by typing them in full
- Results are ordered by relevance within the current translation
- The search covers all 66 books of the Bible`,
        },
        {
          id: 'highlight',
          title: 'Highlighting & annotations',
          content: `## Highlighting & Annotations

**Adding a note to a verse**
Select any verse in the reader and click Add note. Your note is stored in your Verse Journal and linked permanently to that specific verse reference.

**Returning to notes**
From the Notes view, all notes are listed in reverse chronological order. Each note shows its linked verse reference for quick navigation back to the passage.`,
        },
      ],
    },
    {
      id: 'plans',
      label: 'Reading Plans',
      icon: CalendarDays,
      articles: [
        {
          id: 'create-plan',
          title: 'Creating a plan',
          content: `## Creating a Reading Plan

**New plan**
Go to Plans in the sidebar and click New Plan. Give your plan a title and an optional description to help others understand its purpose.

**Adding days**
Each day in your plan has a title and one or more verse references. Add as many days as needed to cover your intended reading scope.

**Visibility**
Toggle the plan to Public if you want other church members to be able to find and join it. Private plans are visible only to you and anyone you share the link with.

**Publishing**
Once your plan has at least one day, click Publish to make it active. Draft plans are not visible to others until published.`,
        },
        {
          id: 'join-plan',
          title: 'Joining a plan',
          content: `## Joining a Plan

**Browse church plans**
Public plans created within your church are visible in the Plans view under the Discover tab. Click Join to add a plan to your active list.

**Invite link**
If someone shares a plan invite link with you, opening it while logged in will add the plan to your account automatically.`,
        },
        {
          id: 'track',
          title: 'Tracking progress',
          content: `## Tracking Progress

**Daily reading**
Each day in your plan shows the assigned Scripture passages. When you finish reading, mark the day complete using the checkbox or button next to the day entry.

**Plan detail**
The plan detail page shows your overall completion progress as a percentage and how many days remain in the plan.

**Dashboard**
Your Dashboard always shows today's scheduled reading for each active plan, so you can pick up exactly where you left off.`,
        },
      ],
    },
    {
      id: 'journal',
      label: 'Verse Journal',
      icon: StickyNote,
      articles: [
        {
          id: 'write-note',
          title: 'Writing notes',
          content: `## Writing Notes

**New note**
Go to Notes in the sidebar and click New Note. Enter the verse reference you want to anchor your note to, then write your reflection in the text area.

**Verse reference format**
Use the standard format Book Chapter:Verse — for example, John 3:16 or Psalm 23:1-6 for a range.

**Autosave**
Notes are saved automatically as you type. They appear in your journal list sorted by most recently updated.`,
        },
        {
          id: 'tags',
          title: 'Tags & organization',
          content: `## Tags & Organization

**Adding tags**
When editing a note, add tags to categorize your reflections. Tags can represent anything meaningful to you — prayer, sermon, devotional, study, or a topic name.

**Filtering by tag**
In the Notes view, use the tag filter panel to show only notes with a specific tag. You can combine multiple tags in the same filter.

**Search**
Use the search bar in Notes to search across all your note content and titles simultaneously.`,
        },
        {
          id: 'share',
          title: 'Sharing reflections',
          content: `## Sharing Reflections

**Private vs. shared notes**
By default, all notes are private and visible only to you. Toggle the Share with church option when writing a note to make it visible to other verified members of your congregation.

**Viewing shared notes**
Shared notes from church members appear in the Community view, where they are attributed by display name.`,
        },
      ],
    },
    {
      id: 'presenter',
      label: 'Sunday Presenter',
      icon: Monitor,
      articles: [
        {
          id: 'setup',
          title: 'Setting up displays',
          content: `## Setting Up Displays

**Connect a second display**
In your operating system's display settings, connect or extend your desktop to a projector or secondary monitor before opening SolaHub.

**Opening the presenter**
Click Presenter in the left sidebar. The presenter control panel opens in your primary window. The output display — what the congregation sees — will appear on the connected secondary screen.

**Display controls**
Use the main presenter window to select slides, advance content, and manage what is shown on the output display at all times.`,
        },
        {
          id: 'slides',
          title: 'Building slide decks',
          content: `## Building Slide Decks

**New presentation**
In the Presenter view, click New Presentation. Give it a title and begin adding slides.

**Bible verse slides**
Add a slide by entering a Bible verse reference. The verse text is automatically retrieved and formatted for large-screen display.

**From a reading plan**
Import verses directly from one of your reading plans to quickly build a slide deck around the day's assigned Scripture passages.`,
        },
        {
          id: 'live',
          title: 'Presenting live',
          content: `## Presenting Live

**Starting a presentation**
Select a presentation in the Presenter view and click Go Live. The output display will immediately show the first slide.

**Advancing slides**
Use the left and right arrow keys, or the on-screen Previous and Next buttons, to advance through slides. The output display updates in real time.

**Ending the presentation**
Click End to clear the output display and return the presenter to an idle state.`,
        },
      ],
    },
  ]

  const activeSection = ref(sections[0].id)
  const activeArticle = ref(sections[0].articles[0].id)

  const currentArticle = computed(() => {
    const sec = sections.find((s) => s.id === activeSection.value)
    return sec?.articles.find((a) => a.id === activeArticle.value) ?? null
  })

  const currentBlocks = computed(() =>
    currentArticle.value ? parseContent(currentArticle.value.content) : []
  )

  function selectArticle(sectionId: string, articleId: string) {
    activeSection.value = sectionId
    activeArticle.value = articleId
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') emit('close')
  }

  onMounted(() => document.addEventListener('keydown', onKey))
  onBeforeUnmount(() => document.removeEventListener('keydown', onKey))

  function parseInline(text: string): InlineSegment[] {
    const segments: InlineSegment[] = []
    const boldPattern = /\*\*(.*?)\*\*/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = boldPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: text.slice(lastIndex, match.index), strong: false })
      }

      segments.push({ text: match[1], strong: true })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      segments.push({ text: text.slice(lastIndex), strong: false })
    }

    return segments.length ? segments : [{ text, strong: false }]
  }

  function parseContent(text: string): ContentBlock[] {
    return text
      .trim()
      .split('\n')
      .flatMap((line) => {
        if (line.startsWith('## ')) {
          return [{ type: 'heading' as const, text: line.slice(3) }]
        }
        if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
          return [{ type: 'label' as const, text: line.slice(2, -2) }]
        }
        if (line.startsWith('- ')) {
          return [{ type: 'bullet' as const, segments: parseInline(line.slice(2)) }]
        }
        if (line.trim() === '') return []
        return [{ type: 'paragraph' as const, segments: parseInline(line) }]
      })
  }
</script>

<template>
  <Teleport to="body">
    <Transition name="docs-fade">
      <div
        v-if="open"
        class="s-modal-backdrop z-modal flex items-center justify-center p-6"
        @click.self="emit('close')"
      >
        <div
          class="w-full max-w-3xl h-[580px] bg-surface-base rounded-2xl shadow-2xl overflow-hidden border border-line flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Documentation"
        >
          <!-- Header -->
          <header
            class="flex items-center justify-between px-5 h-11 border-b border-line-subtle bg-surface-canvas shrink-0"
          >
            <div class="flex items-center gap-2">
              <SBrandMark :size="18" />
              <span class="text-sm font-semibold text-ink-strong">Documentation</span>
            </div>
            <button
              class="h-7 w-7 rounded-md hover:bg-surface-sunken transition-colors flex items-center justify-center text-ink-muted hover:text-ink"
              aria-label="Close"
              @click="emit('close')"
            >
              <X class="h-4 w-4" />
            </button>
          </header>

          <!-- Two-panel body -->
          <div class="flex flex-1 min-h-0">
            <!-- Nav -->
            <nav
              class="w-[200px] shrink-0 border-r border-line-subtle bg-surface-canvas overflow-y-auto py-2 px-2"
            >
              <div v-for="section in sections" :key="section.id" class="mb-0.5">
                <button
                  :class="[
                    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-[11px] font-bold uppercase tracking-[0.07em] transition-colors',
                    activeSection === section.id
                      ? 'text-brand-600 dark:text-brand-300'
                      : 'text-ink-subtle hover:text-ink',
                  ]"
                  @click="selectArticle(section.id, section.articles[0].id)"
                >
                  <component :is="section.icon" class="h-3.5 w-3.5 shrink-0" />
                  {{ section.label }}
                </button>
                <Transition name="docs-nav">
                  <div v-if="activeSection === section.id" class="ml-1.5 mt-0.5 mb-1.5 space-y-px">
                    <button
                      v-for="article in section.articles"
                      :key="article.id"
                      :class="[
                        'w-full text-left px-2.5 py-1 rounded-md text-[13px] transition-colors',
                        activeArticle === article.id
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 font-medium'
                          : 'text-ink-muted hover:text-ink hover:bg-surface-raised',
                      ]"
                      @click="selectArticle(section.id as string, article.id)"
                    >
                      {{ article.title }}
                    </button>
                  </div>
                </Transition>
              </div>
            </nav>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto px-9 py-8">
              <Transition name="docs-content" mode="out-in">
                <div v-if="currentArticle" :key="currentArticle.id">
                  <template
                    v-for="(block, blockIndex) in currentBlocks"
                    :key="`${block.type}-${blockIndex}`"
                  >
                    <h2
                      v-if="block.type === 'heading'"
                      class="text-[15px] font-semibold text-ink-strong mb-2.5 mt-6 first:mt-0"
                    >
                      {{ block.text }}
                    </h2>
                    <p
                      v-else-if="block.type === 'label'"
                      class="text-[13px] font-semibold text-ink mt-4 mb-0.5"
                    >
                      {{ block.text }}
                    </p>
                    <p
                      v-else-if="block.type === 'bullet'"
                      class="flex items-start gap-2 text-sm text-ink-muted leading-relaxed py-0.5"
                    >
                      <span class="text-ink-subtle shrink-0 select-none mt-0.5">•</span>
                      <span>
                        <template
                          v-for="(segment, segmentIndex) in block.segments"
                          :key="segmentIndex"
                        >
                          <strong v-if="segment.strong" class="font-medium text-ink">
                            {{ segment.text }}
                          </strong>
                          <span v-else>{{ segment.text }}</span>
                        </template>
                      </span>
                    </p>
                    <p v-else class="text-sm text-ink-muted leading-relaxed mt-1">
                      <template
                        v-for="(segment, segmentIndex) in block.segments"
                        :key="segmentIndex"
                      >
                        <strong v-if="segment.strong" class="font-medium text-ink">
                          {{ segment.text }}
                        </strong>
                        <span v-else>{{ segment.text }}</span>
                      </template>
                    </p>
                  </template>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .docs-fade-enter-active,
  .docs-fade-leave-active {
    transition: opacity 200ms ease;
  }
  .docs-fade-enter-from,
  .docs-fade-leave-to {
    opacity: 0;
  }

  .docs-nav-enter-active,
  .docs-nav-leave-active {
    transition: all 160ms ease;
    overflow: hidden;
  }
  .docs-nav-enter-from,
  .docs-nav-leave-to {
    opacity: 0;
    max-height: 0;
  }
  .docs-nav-enter-to,
  .docs-nav-leave-from {
    max-height: 200px;
  }

  .docs-content-enter-active,
  .docs-content-leave-active {
    transition: all 160ms ease;
  }
  .docs-content-enter-from {
    opacity: 0;
    transform: translateY(6px);
  }
  .docs-content-leave-to {
    opacity: 0;
  }
</style>
