<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import { useNotesStore } from '@/stores/notes.store'
import AppPageHeader from '@/components/layout/AppPageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSpinner from '@/components/ui/AppSpinner.vue'

const notes = useNotesStore()

const showCreate = ref(false)
const newContent = ref('')
const newVerseRef = ref('')
const newTags = ref('')

onMounted(() => notes.fetchMyNotes())

async function createNote() {
  if (!newContent.value.trim() || !newVerseRef.value.trim()) return
  await notes.create({
    verseRef: newVerseRef.value.trim(),
    content: newContent.value.trim(),
    tags: newTags.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    isShared: false,
  })
  showCreate.value = false
  newContent.value = ''
  newVerseRef.value = ''
  newTags.value = ''
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <AppPageHeader title="Notes" subtitle="Your verse annotations">
      <template #actions>
        <AppButton size="sm" @click="showCreate = !showCreate">
          <Plus class="h-4 w-4" />
          New Note
        </AppButton>
      </template>
    </AppPageHeader>

    <div class="flex-1 overflow-y-auto p-6 space-y-4">
      <!-- Create form -->
      <Transition name="fade">
        <AppCard v-if="showCreate" class="space-y-3">
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">New Note</p>
          <input
            v-model="newVerseRef"
            placeholder="Verse ref (e.g. JHN.3.16)"
            class="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <textarea
            v-model="newContent"
            rows="4"
            placeholder="Your note..."
            class="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          <input
            v-model="newTags"
            placeholder="Tags (comma-separated, e.g. faith, grace)"
            class="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div class="flex gap-2 justify-end">
            <AppButton variant="secondary" size="sm" @click="showCreate = false">Cancel</AppButton>
            <AppButton size="sm" :loading="notes.isSaving" @click="createNote">Save</AppButton>
          </div>
        </AppCard>
      </Transition>

      <!-- Loading -->
      <div v-if="notes.isLoading" class="flex justify-center pt-8">
        <AppSpinner />
      </div>

      <!-- Empty state -->
      <div v-else-if="notes.notes.length === 0 && !showCreate" class="text-center text-slate-400 pt-16">
        <p class="text-sm">No notes yet. Create your first verse note.</p>
      </div>

      <!-- Notes list -->
      <div v-else class="space-y-3">
        <AppCard
          v-for="note in notes.notes"
          :key="note.id"
          class="relative group"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-1">
                {{ note.verseRef }}
              </p>
              <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {{ note.content }}
              </p>
              <div v-if="note.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
                <AppBadge
                  v-for="tag in note.tags"
                  :key="tag"
                  variant="primary"
                  size="sm"
                >
                  {{ tag }}
                </AppBadge>
              </div>
            </div>
            <button
              class="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              @click="notes.remove(note.id)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
          <p class="text-[10px] text-slate-400 mt-2">
            {{ new Date(note.updatedAt).toLocaleDateString() }}
            <span v-if="note.isShared" class="ml-2 text-emerald-500">Shared</span>
          </p>
        </AppCard>
      </div>
    </div>
  </div>
</template>
