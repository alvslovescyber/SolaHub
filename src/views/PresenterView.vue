<script setup lang="ts">
import { computed } from 'vue'
import { Monitor, ChevronLeft, ChevronRight, Maximize2, ExternalLink } from 'lucide-vue-next'
import { usePresenterStore } from '@/stores/presenter.store'
import { useBibleStore } from '@/stores/bible.store'
import AppPageHeader from '@/components/layout/AppPageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import type { PresenterSlide } from '@/types/presenter.types'

const presenter = usePresenterStore()
const bible = useBibleStore()

const slide = computed(() => presenter.currentSlide)
const progress = computed(() => presenter.progress)

async function loadCurrentChapterAsSlides() {
  if (!bible.currentChapter) return
  const slides: PresenterSlide[] = bible.currentChapter.verses.map((v) => ({
    verseRef: `${v.book}.${v.chapter}.${v.verse}`,
    text: v.text,
    book: v.book,
    chapter: v.chapter,
    verse: v.verse,
  }))
  presenter.loadSlides(slides)
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <AppPageHeader title="Presenter" subtitle="Project Scripture to the congregation">
      <template #actions>
        <AppButton
          variant="secondary"
          size="sm"
          :disabled="!presenter.session.displayWindowOpen"
          @click="presenter.closeDisplayWindow()"
        >
          Close Display
        </AppButton>
        <AppButton size="sm" @click="presenter.openDisplayWindow()">
          <ExternalLink class="h-4 w-4" />
          Open Display
        </AppButton>
      </template>
    </AppPageHeader>

    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <!-- Load slides from current Bible chapter -->
      <AppCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-slate-900 dark:text-white">Load from Bible</p>
            <p class="text-xs text-slate-500 mt-0.5">
              Load the current chapter ({{ bible.selectedBook }} {{ bible.selectedChapter }}) as slides
            </p>
          </div>
          <AppButton size="sm" variant="secondary" @click="loadCurrentChapterAsSlides">
            <Monitor class="h-4 w-4" />
            Load
          </AppButton>
        </div>
      </AppCard>

      <!-- Slide preview -->
      <div v-if="presenter.session.slides.length > 0">
        <!-- Current slide preview -->
        <div class="rounded-xl bg-slate-900 dark:bg-black aspect-video flex flex-col items-center justify-center p-8 shadow-2xl">
          <div v-if="slide" class="presenter-slide">
            {{ slide.text }}
          </div>
          <div v-else class="text-slate-500 text-sm">No slide selected</div>

          <p v-if="slide" class="text-slate-400 text-sm mt-6">
            {{ slide.book }} {{ slide.chapter }}:{{ slide.verse }}
          </p>
        </div>

        <!-- Progress bar -->
        <div class="mt-3 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-primary-600 rounded-full transition-all duration-300"
            :style="{ width: `${progress}%` }"
          />
        </div>

        <p class="text-center text-xs text-slate-500 mt-1">
          {{ presenter.session.currentIndex + 1 }} / {{ presenter.session.slides.length }}
        </p>

        <!-- Controls -->
        <div class="flex items-center justify-center gap-4 mt-4">
          <AppButton
            variant="secondary"
            :disabled="!presenter.hasPrev"
            @click="presenter.prev()"
          >
            <ChevronLeft class="h-4 w-4" />
            Previous
          </AppButton>

          <AppButton
            variant="secondary"
            @click="presenter.toggleFullscreen()"
          >
            <Maximize2 class="h-4 w-4" />
            {{ presenter.session.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
          </AppButton>

          <AppButton
            :disabled="!presenter.hasNext"
            @click="presenter.next()"
          >
            Next
            <ChevronRight class="h-4 w-4" />
          </AppButton>
        </div>

        <!-- Slide list -->
        <div class="mt-6 space-y-1 max-h-48 overflow-y-auto">
          <button
            v-for="(s, i) in presenter.session.slides"
            :key="i"
            :class="[
              'w-full text-left px-3 py-2 rounded-lg text-xs transition-colors',
              i === presenter.session.currentIndex
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
            ]"
            @click="presenter.goTo(i)"
          >
            <span class="font-medium">{{ s.book }} {{ s.chapter }}:{{ s.verse }}</span>
            <span class="ml-2 text-slate-400 line-clamp-1">{{ s.text }}</span>
          </button>
        </div>
      </div>

      <div v-else class="text-center text-slate-400 pt-8">
        <Monitor class="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p class="text-sm">Load slides from the Bible to begin presenting.</p>
      </div>
    </div>
  </div>
</template>
