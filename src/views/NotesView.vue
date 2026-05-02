<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { Plus, Search, StickyNote, Trash2 } from 'lucide-vue-next'
  import { useNotesStore } from '@/stores/notes.store'
  import {
    SButton,
    SCard,
    SChip,
    SEmptyState,
    SIconButton,
    SInput,
    SModal,
    SPageContainer,
    SSpinner,
    STextarea,
    STopBar,
  } from '@/components/s'

  const notes = useNotesStore()

  const showCreate = ref(false)
  const newContent = ref('')
  const newVerseRef = ref('')
  const newTags = ref('')
  const search = ref('')

  onMounted(() => notes.fetchMyNotes())

  const filtered = computed(() => {
    const q = search.value.trim().toLowerCase()
    if (!q) return notes.notes
    return notes.notes.filter(
      (n) =>
        n.verseRef.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    )
  })

  function confirmDelete(id: string) {
    if (window.confirm('Delete this note?')) void notes.remove(id)
  }

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
  <div class="flex flex-col flex-1 min-w-0">
    <STopBar title="Notes" subtitle="Verse-by-verse reflections and study notes">
      <template #actions>
        <SButton size="sm" variant="primary" @click="showCreate = true">
          <template #leading>
            <Plus class="h-3.5 w-3.5" />
          </template>
          New note
        </SButton>
      </template>
    </STopBar>

    <div class="px-6 pt-4 shrink-0 max-w-2xl">
      <SInput v-model="search" size="sm" placeholder="Search notes, verses, or tags">
        <template #leading>
          <Search class="h-3.5 w-3.5" />
        </template>
      </SInput>
    </div>

    <SPageContainer max="lg" padding="md">
      <SSpinner v-if="notes.isLoading" size="sm" />

      <SCard v-else-if="filtered.length === 0" padding="none">
        <SEmptyState
          tone="sun"
          title="No notes yet"
          description="Highlight a verse and write what God is teaching you. Notes live here, organised by reference."
        >
          <template #icon>
            <StickyNote class="h-5 w-5" />
          </template>
          <template #actions>
            <SButton size="sm" @click="showCreate = true"> Create your first note </SButton>
          </template>
        </SEmptyState>
      </SCard>

      <div v-else class="space-y-2.5">
        <SCard v-for="note in filtered" :key="note.id" padding="md" class="group">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p
                class="text-2xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300"
              >
                {{ note.verseRef }}
              </p>
              <p class="mt-1.5 text-sm text-ink leading-relaxed whitespace-pre-wrap">
                {{ note.content }}
              </p>
              <div v-if="note.tags.length > 0" class="mt-2 flex flex-wrap gap-1">
                <SChip v-for="tag in note.tags" :key="tag" tone="brand">
                  {{ tag }}
                </SChip>
              </div>
            </div>
            <div class="opacity-0 group-hover:opacity-100 transition-opacity">
              <SIconButton size="sm" label="Delete note" @click="confirmDelete(note.id)">
                <Trash2 class="h-3.5 w-3.5 text-red-500" />
              </SIconButton>
            </div>
          </div>
          <p class="mt-2 text-2xs text-ink-subtle">
            {{ new Date(note.updatedAt).toLocaleDateString() }}
            <span v-if="note.isShared" class="ml-2 text-emerald-500 font-medium">Shared</span>
          </p>
        </SCard>
      </div>
    </SPageContainer>

    <SModal :open="showCreate" title="New note" size="md" @close="showCreate = false">
      <div class="space-y-3">
        <SInput v-model="newVerseRef" label="Verse reference" placeholder="JHN.3.16" required />
        <STextarea
          v-model="newContent"
          label="Reflection"
          placeholder="Your note…"
          :rows="5"
          required
        />
        <SInput v-model="newTags" label="Tags" placeholder="faith, grace (comma separated)" />
      </div>
      <template #footer>
        <SButton variant="secondary" size="sm" @click="showCreate = false"> Cancel </SButton>
        <SButton size="sm" :loading="notes.isSaving" @click="createNote"> Save note </SButton>
      </template>
    </SModal>
  </div>
</template>
