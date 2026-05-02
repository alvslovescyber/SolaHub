<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { Pencil, Plus, Search, StickyNote, Trash2 } from 'lucide-vue-next'
  import { useNotesStore } from '@/stores/notes.store'
  import type { VerseNote } from '@/types/notes.types'
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
    useSToast,
  } from '@/components/s'

  const notes = useNotesStore()
  const toast = useSToast()

  // Minimal verse ref pattern: BOOK.CHAPTER[.VERSE] e.g. JHN.3 or JHN.3.16
  const VERSE_REF_PATTERN = /^[A-Za-z]{2,4}\.\d+(\.\d+)?$/

  // ── Create modal ──────────────────────────────────────────────────────────────
  const showCreate = ref(false)
  const newContent = ref('')
  const newVerseRef = ref('')
  const newTags = ref('')
  const newVerseRefError = ref('')

  // ── Edit modal ────────────────────────────────────────────────────────────────
  const editNote = ref<VerseNote | null>(null)
  const editContent = ref('')
  const editTags = ref('')
  const editIsShared = ref(false)

  // ── Delete confirm ────────────────────────────────────────────────────────────
  const pendingDeleteId = ref<string | null>(null)

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

  function openEdit(note: VerseNote) {
    editNote.value = note
    editContent.value = note.content
    editTags.value = note.tags.join(', ')
    editIsShared.value = note.isShared
  }

  function closeEdit() {
    editNote.value = null
  }

  async function saveEdit() {
    if (!editNote.value || !editContent.value.trim()) return
    try {
      await notes.update(editNote.value.id, {
        content: editContent.value.trim(),
        tags: editTags.value
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        isShared: editIsShared.value,
      })
      toast.success('Note updated')
      closeEdit()
    } catch {
      toast.error('Could not update note', notes.error ?? undefined)
    }
  }

  function confirmDelete(id: string) {
    pendingDeleteId.value = id
  }

  async function executeDelete() {
    if (!pendingDeleteId.value) return
    try {
      await notes.remove(pendingDeleteId.value)
      pendingDeleteId.value = null
      toast.success('Note deleted')
    } catch {
      pendingDeleteId.value = null
      toast.error('Could not delete note', notes.error ?? undefined)
    }
  }

  async function createNote() {
    newVerseRefError.value = ''
    if (!newContent.value.trim() || !newVerseRef.value.trim()) return
    if (!VERSE_REF_PATTERN.test(newVerseRef.value.trim())) {
      newVerseRefError.value = 'Use format BOOK.CHAPTER or BOOK.CHAPTER.VERSE (e.g. JHN.3.16)'
      return
    }
    try {
      await notes.create({
        verseRef: newVerseRef.value.trim(),
        content: newContent.value.trim(),
        tags: newTags.value
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        isShared: false,
      })
      toast.success('Note saved')
      showCreate.value = false
      newContent.value = ''
      newVerseRef.value = ''
      newTags.value = ''
    } catch {
      toast.error('Could not save note', notes.error ?? undefined)
    }
  }
</script>

<template>
  <div class="flex flex-col flex-1 min-w-0">
    <STopBar
      title="Notes"
      subtitle="Verse-by-verse reflections and study notes"
    >
      <template #actions>
        <SButton
          size="sm"
          variant="primary"
          @click="showCreate = true"
        >
          <template #leading>
            <Plus class="h-3.5 w-3.5" />
          </template>
          New note
        </SButton>
      </template>
    </STopBar>

    <div class="px-6 pt-4 shrink-0 max-w-2xl">
      <SInput
        v-model="search"
        size="sm"
        placeholder="Search notes, verses, or tags"
      >
        <template #leading>
          <Search class="h-3.5 w-3.5" />
        </template>
      </SInput>
    </div>

    <SPageContainer
      max="lg"
      padding="md"
    >
      <SSpinner
        v-if="notes.isLoading"
        size="sm"
      />

      <SCard
        v-else-if="filtered.length === 0"
        padding="none"
      >
        <SEmptyState
          tone="sun"
          title="No notes yet"
          description="Highlight a verse and write what God is teaching you. Notes live here, organised by reference."
        >
          <template #icon>
            <StickyNote class="h-5 w-5" />
          </template>
          <template #actions>
            <SButton
              size="sm"
              @click="showCreate = true"
            >
              Create your first note
            </SButton>
          </template>
        </SEmptyState>
      </SCard>

      <div
        v-else
        class="space-y-2.5"
      >
        <SCard
          v-for="note in filtered"
          :key="note.id"
          padding="md"
          class="group"
        >
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
              <div
                v-if="note.tags.length > 0"
                class="mt-2 flex flex-wrap gap-1"
              >
                <SChip
                  v-for="tag in note.tags"
                  :key="tag"
                  tone="brand"
                >
                  {{ tag }}
                </SChip>
              </div>
            </div>
            <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <SIconButton
                size="sm"
                label="Edit note"
                @click="openEdit(note)"
              >
                <Pencil class="h-3.5 w-3.5 text-ink-muted" />
              </SIconButton>
              <SIconButton
                size="sm"
                label="Delete note"
                @click="confirmDelete(note.id)"
              >
                <Trash2 class="h-3.5 w-3.5 text-red-500" />
              </SIconButton>
            </div>
          </div>
          <p class="mt-2 text-2xs text-ink-subtle">
            {{ new Date(note.updatedAt).toLocaleDateString() }}
            <span
              v-if="note.isShared"
              class="ml-2 text-emerald-500 font-medium"
            >Shared</span>
          </p>
        </SCard>
      </div>
    </SPageContainer>

    <!-- Create modal -->
    <SModal
      :open="showCreate"
      title="New note"
      size="md"
      @close="showCreate = false"
    >
      <div class="space-y-3">
        <div>
          <SInput
            v-model="newVerseRef"
            label="Verse reference"
            placeholder="JHN.3.16"
            required
          />
          <p
            v-if="newVerseRefError"
            class="mt-1 text-xs text-red-600 dark:text-red-400"
          >{{ newVerseRefError }}</p>
          <p
            v-else
            class="mt-1 text-[11px] text-ink-subtle"
          >
            Format: <code class="font-mono bg-surface-canvas px-0.5 rounded text-[10px]">BOOK.CHAPTER</code> or <code class="font-mono bg-surface-canvas px-0.5 rounded text-[10px]">BOOK.CHAPTER.VERSE</code>
          </p>
        </div>
        <STextarea
          v-model="newContent"
          label="Reflection"
          placeholder="Your note…"
          :rows="5"
          required
        />
        <SInput
          v-model="newTags"
          label="Tags"
          placeholder="faith, grace (comma separated)"
        />
      </div>
      <template #footer>
        <SButton
          variant="secondary"
          size="sm"
          @click="showCreate = false"
        >
          Cancel
        </SButton>
        <SButton
          size="sm"
          :loading="notes.isSaving"
          @click="createNote"
        >
          Save note
        </SButton>
      </template>
    </SModal>

    <!-- Edit modal -->
    <SModal
      :open="!!editNote"
      title="Edit note"
      size="md"
      @close="closeEdit"
    >
      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
          {{ editNote?.verseRef }}
        </p>
        <STextarea
          v-model="editContent"
          label="Reflection"
          placeholder="Your note…"
          :rows="5"
          required
        />
        <SInput
          v-model="editTags"
          label="Tags"
          placeholder="faith, grace (comma separated)"
        />
      </div>
      <template #footer>
        <SButton
          variant="secondary"
          size="sm"
          @click="closeEdit"
        >
          Cancel
        </SButton>
        <SButton
          size="sm"
          :loading="notes.isSaving"
          :disabled="!editContent.trim()"
          @click="saveEdit"
        >
          Save changes
        </SButton>
      </template>
    </SModal>

    <!-- Delete confirm modal -->
    <SModal
      :open="!!pendingDeleteId"
      title="Delete note?"
      size="sm"
      @close="pendingDeleteId = null"
    >
      <p class="text-sm text-ink-muted">This note will be permanently deleted. This cannot be undone.</p>
      <template #footer>
        <SButton variant="secondary" size="sm" @click="pendingDeleteId = null">Cancel</SButton>
        <SButton variant="danger" size="sm" @click="executeDelete">Delete</SButton>
      </template>
    </SModal>
  </div>
</template>
