<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { Monitor, ChevronLeft, ChevronRight, Maximize2, ExternalLink } from 'lucide-vue-next'
  import { usePresenterStore } from '@/stores/presenter.store'
  import { useBibleStore } from '@/stores/bible.store'
  import { useBiblePreferencesStore } from '@/stores/biblePreferences.store'
  import { bibleService } from '@/services/bible.service'
  import { catalogMeta } from '@/constants/bibleTranslations'
  import { SButton, SCard, SEmptyState, SPageContainer, STopBar, useSToast } from '@/components/s'
  import type { PresenterSlide } from '@/types/presenter.types'

  const presenter = usePresenterStore()
  const bible = useBibleStore()
  const biblePrefs = useBiblePreferencesStore()
  const toast = useSToast()
  const loadingSlides = ref(false)

  const slide = computed(() => presenter.currentSlide)
  const progress = computed(() => presenter.progress)

  const presenterTranslationHint = computed(() => {
    const id = biblePrefs.effectivePresenterTranslationId()
    return catalogMeta(id)?.name ?? id.toUpperCase()
  })

  async function loadCurrentChapterAsSlides() {
    loadingSlides.value = true
    try {
      const t = biblePrefs.translationApiCode(biblePrefs.effectivePresenterTranslationId())
      const chapter = await bibleService.getChapter(bible.selectedBook, bible.selectedChapter, t)
      const slides: PresenterSlide[] = chapter.verses.map((v) => ({
        verseRef: `${v.book}.${v.chapter}.${v.verse}`,
        text: v.text,
        book: v.book,
        chapter: v.chapter,
        verse: v.verse,
      }))
      presenter.loadSlides(slides)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Try another translation in Settings.'
      toast.error('Could not load chapter', msg)
    } finally {
      loadingSlides.value = false
    }
  }
</script>

<template>
  <div class="flex flex-col flex-1 min-w-0">
    <STopBar
      title="Presenter"
      subtitle="Project Scripture to the congregation"
    >
      <template #actions>
        <SButton
          variant="secondary"
          size="sm"
          :disabled="!presenter.session.displayWindowOpen"
          @click="presenter.closeDisplayWindow()"
        >
          Close display
        </SButton>
        <SButton
          size="sm"
          variant="primary"
          @click="presenter.openDisplayWindow()"
        >
          <template #leading>
            <ExternalLink class="h-3.5 w-3.5" />
          </template>
          Open display
        </SButton>
      </template>
    </STopBar>

    <SPageContainer
      max="2xl"
      padding="lg"
    >
      <SCard
        padding="md"
        class="flex items-center justify-between"
      >
        <div>
          <p class="text-sm font-semibold text-ink-strong">
            Load from Bible
          </p>
          <p class="text-xs text-ink-muted mt-0.5">
            Loads {{ bible.selectedBook }} {{ bible.selectedChapter }} using
            <span class="text-ink-strong">{{ presenterTranslationHint }}</span>
            — adjust translations and slide styling in Settings.
          </p>
        </div>
        <SButton
          size="sm"
          variant="secondary"
          :loading="loadingSlides"
          @click="loadCurrentChapterAsSlides()"
        >
          <template #leading>
            <Monitor class="h-3.5 w-3.5" />
          </template>
          Load chapter
        </SButton>
      </SCard>

      <div
        v-if="presenter.session.slides.length > 0"
        class="mt-6"
      >
        <div
          :class="[
            'rounded-xl aspect-video flex flex-col items-center justify-center p-8 shadow-modal',
            biblePrefs.presenterRootClass,
          ]"
        >
          <div
            v-if="slide"
            class="presenter-slide max-w-5xl px-4"
            :style="{ fontSize: biblePrefs.presenterVerseFontSize }"
          >
            {{ slide.text }}
          </div>
          <div
            v-else
            class="text-slate-400 text-sm"
          >
            No slide selected
          </div>
          <p
            v-if="slide && biblePrefs.presenterShowVerseRef"
            class="text-slate-400 font-medium mt-6"
            :style="{ fontSize: biblePrefs.presenterRefFontSize }"
          >
            {{ slide.book }} {{ slide.chapter }}:{{ slide.verse }}
          </p>
        </div>

        <div class="mt-3 h-1 bg-line rounded-full overflow-hidden">
          <div
            class="h-full bg-brand-500 rounded-full transition-all duration-300"
            :style="{ width: `${progress}%` }"
          />
        </div>
        <p class="text-center text-2xs text-ink-muted mt-1">
          {{ presenter.session.currentIndex + 1 }} / {{ presenter.session.slides.length }}
        </p>

        <div class="flex items-center justify-center gap-2 mt-4">
          <SButton
            variant="secondary"
            size="sm"
            :disabled="!presenter.hasPrev"
            @click="presenter.prev()"
          >
            <template #leading>
              <ChevronLeft class="h-3.5 w-3.5" />
            </template>
            Previous
          </SButton>
          <SButton
            variant="secondary"
            size="sm"
            @click="presenter.toggleFullscreen()"
          >
            <template #leading>
              <Maximize2 class="h-3.5 w-3.5" />
            </template>
            {{ presenter.session.isFullscreen ? 'Exit fullscreen' : 'Fullscreen' }}
          </SButton>
          <SButton
            size="sm"
            :disabled="!presenter.hasNext"
            @click="presenter.next()"
          >
            Next
            <template #trailing>
              <ChevronRight class="h-3.5 w-3.5" />
            </template>
          </SButton>
        </div>

        <SCard
          padding="none"
          class="mt-6 max-h-64 overflow-y-auto"
        >
          <button
            v-for="(s, i) in presenter.session.slides"
            :key="i"
            :class="[
              'w-full text-left px-4 py-2.5 border-b border-line-subtle last:border-b-0 text-xs transition-colors',
              i === presenter.session.currentIndex
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                : 'text-ink hover:bg-surface-canvas',
            ]"
            @click="presenter.goTo(i)"
          >
            <span class="font-semibold">{{ s.book }} {{ s.chapter }}:{{ s.verse }}</span>
            <span class="ml-2 text-ink-muted line-clamp-1">{{ s.text }}</span>
          </button>
        </SCard>
      </div>

      <SCard
        v-else
        padding="none"
        class="mt-6"
      >
        <SEmptyState
          tone="violet"
          title="Ready when Sunday is"
          description="Open the Bible, navigate to a chapter, then return here to load it as slides for the congregation."
        >
          <template #icon>
            <Monitor class="h-5 w-5" />
          </template>
        </SEmptyState>
      </SCard>
    </SPageContainer>
  </div>
</template>
