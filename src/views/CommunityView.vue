<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import {
    BookOpen,
    Edit3,
    FileText,
    Flag,
    Globe2,
    Lock,
    MessageSquareText,
    Plus,
    RefreshCw,
    Send,
    Trash2,
    Users,
  } from 'lucide-vue-next'
  import { useCommunityStore } from '@/stores/community.store'
  import { useNotationsStore } from '@/stores/notations.store'
  import type {
    CommunityFeed,
    CommunityPost,
    CommunityPostKind,
    CommunityVisibility,
    UpsertCommunityPostPayload,
  } from '@/types/community.types'
  import type { NotationDeck } from '@/types/presenter.types'
  import {
    SButton,
    SCard,
    SChip,
    SEmptyState,
    SInput,
    SModal,
    SNotationSlideCanvas,
    SPageContainer,
    SPageTabs,
    SSpinner,
    STextarea,
    STopBar,
    useSToast,
  } from '@/components/s'

  interface ComposerForm {
    kind: CommunityPostKind
    visibility: CommunityVisibility
    title: string
    body: string
    verseRef: string
    tags: string
    deckId: string | null
  }

  const community = useCommunityStore()
  const notations = useNotationsStore()
  const route = useRoute()
  const router = useRouter()
  const toast = useSToast()

  const tab = ref<CommunityFeed>('everyone')
  const tabs = [
    { id: 'everyone', label: 'Everyone' },
    { id: 'mine', label: 'Mine' },
  ] as const
  const kindOptions = [
    {
      id: 'Post',
      label: 'Post',
      description: 'Share an update or reflection.',
      icon: MessageSquareText,
    },
    {
      id: 'FavouriteVerse',
      label: 'Favourite verse',
      description: 'Post Scripture with a reflection.',
      icon: BookOpen,
    },
    {
      id: 'NotationDeck',
      label: 'Notation deck',
      description: 'Share Sunday notations.',
      icon: FileText,
    },
  ] as const
  const visibilityOptions = [
    {
      id: 'Private',
      label: 'Only me',
      description: 'Saved to your community history.',
      icon: Lock,
    },
    {
      id: 'Public',
      label: 'Everyone',
      description: 'Visible to signed-in SolaHub users.',
      icon: Globe2,
    },
  ] as const

  const composerOpen = ref(false)
  const editingPost = ref<CommunityPost | null>(null)
  const pendingDeletePost = ref<CommunityPost | null>(null)
  const form = ref<ComposerForm>(emptyForm())

  const posts = computed(() => community.postsFor(tab.value))
  const localDecks = computed(() => notations.decks)
  const selectedLocalDeck = computed(
    () => localDecks.value.find((deck) => deck.id === form.value.deckId) ?? null
  )
  const activeDeck = computed(() => selectedLocalDeck.value ?? editingPost.value?.deck ?? null)
  const deckHasPublicUnsupportedBackground = computed(
    () =>
      form.value.visibility === 'Public' &&
      activeDeck.value !== null &&
      hasUnsupportedDeck(activeDeck.value)
  )

  const submitDisabled = computed(() => {
    if (community.isSaving) return true
    if (form.value.kind === 'NotationDeck') {
      return (
        !form.value.title.trim() || !activeDeck.value || deckHasPublicUnsupportedBackground.value
      )
    }
    if (form.value.kind === 'FavouriteVerse') {
      return !form.value.verseRef.trim() || !form.value.body.trim()
    }
    return !form.value.body.trim()
  })

  onMounted(() => {
    void community.fetchFeed(tab.value)
    openFromRouteQuery()
  })

  watch(tab, (next) => {
    void community.fetchFeed(next)
  })

  watch(
    () => route.query,
    () => openFromRouteQuery()
  )

  function emptyForm(): ComposerForm {
    return {
      kind: 'Post',
      visibility: 'Private',
      title: '',
      body: '',
      verseRef: '',
      tags: '',
      deckId: null,
    }
  }

  function openComposer(kind: CommunityPostKind = 'Post') {
    editingPost.value = null
    form.value = emptyForm()
    form.value.kind = kind
    if (kind === 'NotationDeck') {
      const currentDeck = notations.currentDeck ?? localDecks.value[0] ?? null
      form.value.deckId = currentDeck?.id ?? null
      form.value.title = currentDeck?.title ?? ''
    }
    composerOpen.value = true
  }

  function openEdit(post: CommunityPost) {
    editingPost.value = post
    form.value = {
      kind: post.kind,
      visibility: post.visibility,
      title: post.title,
      body: post.body,
      verseRef: post.verseRef ?? '',
      tags: post.tags.join(', '),
      deckId: post.deck
        ? (localDecks.value.find((deck) => deck.id === post.deck?.id)?.id ?? null)
        : null,
    }
    composerOpen.value = true
  }

  function closeComposer() {
    composerOpen.value = false
    editingPost.value = null
  }

  async function submitPost() {
    if (submitDisabled.value) return

    const payload = buildPayload()
    try {
      const post = editingPost.value
        ? await community.update(editingPost.value.id, payload)
        : await community.create(payload)
      toast.success(editingPost.value ? 'Community post updated' : 'Community post shared')
      closeComposer()
      tab.value = post.visibility === 'Public' ? 'everyone' : 'mine'
      await community.fetchFeed(tab.value, true)
    } catch (error) {
      toast.error('Could not save community post', extractErrorMessage(error))
    }
  }

  function confirmDelete(post: CommunityPost) {
    pendingDeletePost.value = post
  }

  async function executeDelete() {
    const post = pendingDeletePost.value
    if (!post) return
    try {
      await community.remove(post.id)
      pendingDeletePost.value = null
      toast.success('Community post deleted')
    } catch (error) {
      pendingDeletePost.value = null
      toast.error('Could not delete community post', extractErrorMessage(error))
    }
  }

  async function reportPost(post: CommunityPost) {
    try {
      await community.report(post.id, 'Reported from community feed')
      toast.success('Post reported', 'It has been hidden from your feed.')
    } catch (error) {
      toast.error('Could not report post', extractErrorMessage(error))
    }
  }

  async function refresh() {
    await community.fetchFeed(tab.value, true)
  }

  function buildPayload(): UpsertCommunityPostPayload {
    return {
      kind: form.value.kind,
      visibility: form.value.visibility,
      title: form.value.title.trim(),
      body: form.value.body.trim(),
      verseRef: form.value.kind === 'FavouriteVerse' ? form.value.verseRef.trim() : null,
      tags: form.value.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      deck:
        form.value.kind === 'NotationDeck' && activeDeck.value ? cloneDeck(activeDeck.value) : null,
    }
  }

  function cloneDeck(deck: NotationDeck): NotationDeck {
    return JSON.parse(JSON.stringify(deck)) as NotationDeck
  }

  function openFromRouteQuery() {
    if (route.query.compose !== 'notationDeck') return
    openComposer('NotationDeck')
    if (typeof route.query.deckId === 'string') {
      form.value.deckId = route.query.deckId
      const deck = localDecks.value.find((candidate) => candidate.id === route.query.deckId)
      if (deck) form.value.title = deck.title
    }
    clearComposerQuery()
  }

  function clearComposerQuery() {
    const nextQuery = { ...route.query }
    delete nextQuery.compose
    delete nextQuery.deckId
    void router.replace({ query: nextQuery })
  }

  function hasUnsupportedDeck(deck: NotationDeck): boolean {
    return deck.slides.some(
      (slide) =>
        slide.background.type === 'image' ||
        slide.background.value.toLowerCase().startsWith('data:')
    )
  }

  function kindLabel(kind: CommunityPostKind): string {
    switch (kind) {
      case 'FavouriteVerse':
        return 'Favourite verse'
      case 'NotationDeck':
        return 'Notation deck'
      default:
        return 'Post'
    }
  }

  function postIcon(kind: CommunityPostKind) {
    switch (kind) {
      case 'FavouriteVerse':
        return BookOpen
      case 'NotationDeck':
        return FileText
      default:
        return MessageSquareText
    }
  }

  function formatDate(value: string): string {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function extractErrorMessage(error: unknown): string | undefined {
    const data = (error as { response?: { data?: { description?: string } } }).response?.data
    return typeof data?.description === 'string' ? data.description : (community.error ?? undefined)
  }
</script>

<template>
  <div class="flex min-w-0 flex-1 flex-col">
    <STopBar title="Community" subtitle="Posts, favourite verses, and shared notation decks">
      <template #actions>
        <SButton size="sm" variant="secondary" :loading="community.isLoading" @click="refresh">
          <template #leading>
            <RefreshCw class="h-3.5 w-3.5" />
          </template>
          Refresh
        </SButton>
        <SButton size="sm" variant="primary" @click="openComposer('Post')">
          <template #leading>
            <Plus class="h-3.5 w-3.5" />
          </template>
          New post
        </SButton>
      </template>
    </STopBar>

    <SPageTabs v-model="tab" :tabs="tabs" />

    <SPageContainer max="2xl" padding="lg">
      <div class="mb-4 grid gap-3 md:grid-cols-3">
        <SButton variant="secondary" class="justify-start" @click="openComposer('Post')">
          <template #leading>
            <MessageSquareText class="h-4 w-4" />
          </template>
          Post update
        </SButton>
        <SButton variant="secondary" class="justify-start" @click="openComposer('FavouriteVerse')">
          <template #leading>
            <BookOpen class="h-4 w-4" />
          </template>
          Favourite verse
        </SButton>
        <SButton variant="secondary" class="justify-start" @click="openComposer('NotationDeck')">
          <template #leading>
            <FileText class="h-4 w-4" />
          </template>
          Share notations
        </SButton>
      </div>

      <SCard v-if="community.error && posts.length > 0" class="mb-4" padding="sm">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-red-600 dark:text-red-400">{{ community.error }}</p>
          <SButton size="sm" variant="secondary" @click="refresh">Retry</SButton>
        </div>
      </SCard>

      <div v-if="community.isLoading && posts.length === 0" class="py-12">
        <SSpinner class="mx-auto" />
      </div>

      <SCard v-else-if="community.error" padding="none">
        <SEmptyState
          tone="neutral"
          title="Community posts could not load"
          :description="community.error"
        >
          <template #icon>
            <RefreshCw class="h-5 w-5" />
          </template>
          <template #actions>
            <SButton size="sm" variant="secondary" @click="refresh">Retry</SButton>
          </template>
        </SEmptyState>
      </SCard>

      <SCard v-else-if="posts.length === 0" padding="none">
        <SEmptyState
          tone="neutral"
          :title="tab === 'everyone' ? 'No public posts yet' : 'No saved community posts'"
          :description="
            tab === 'everyone'
              ? 'Public posts from signed-in SolaHub users will appear here.'
              : 'Private posts and anything you share publicly will appear here.'
          "
        >
          <template #icon>
            <Users class="h-5 w-5" />
          </template>
        </SEmptyState>
      </SCard>

      <div v-else class="space-y-3">
        <SCard v-for="post in posts" :key="post.id" as="article" padding="md">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <component :is="postIcon(post.kind)" class="h-4 w-4 text-brand-600" />
                <p class="text-sm font-semibold text-ink-strong">
                  {{ post.authorDisplayName }}
                </p>
                <span class="text-xs text-ink-subtle">{{ formatDate(post.createdAt) }}</span>
                <SChip tone="brand">{{ kindLabel(post.kind) }}</SChip>
                <SChip :tone="post.visibility === 'Public' ? 'success' : 'neutral'">
                  <span class="inline-flex items-center gap-1">
                    <Globe2 v-if="post.visibility === 'Public'" class="h-3 w-3" />
                    <Lock v-else class="h-3 w-3" />
                    {{ post.visibility === 'Public' ? 'Everyone' : 'Only me' }}
                  </span>
                </SChip>
              </div>

              <h2 v-if="post.title" class="mt-3 text-base font-semibold text-ink-strong">
                {{ post.title }}
              </h2>

              <p
                v-if="post.verseRef"
                class="mt-2 inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
              >
                <BookOpen class="h-3.5 w-3.5" />
                {{ post.verseRef }}
              </p>

              <p v-if="post.body" class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {{ post.body }}
              </p>

              <div v-if="post.tags.length > 0" class="mt-3 flex flex-wrap gap-1.5">
                <SChip v-for="tag in post.tags" :key="tag" tone="neutral">
                  {{ tag }}
                </SChip>
              </div>

              <div
                v-if="post.kind === 'NotationDeck' && post.deck?.slides.length"
                class="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem]"
              >
                <div
                  class="aspect-video overflow-hidden rounded-lg border border-white/15 bg-black"
                >
                  <SNotationSlideCanvas :slide="post.deck.slides[0]" mode="fill" />
                </div>
                <div class="rounded-lg border border-line-subtle bg-surface-canvas p-3">
                  <p class="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Deck</p>
                  <p class="mt-1 text-sm font-semibold text-ink-strong">
                    {{ post.deck.title }}
                  </p>
                  <p class="mt-1 text-xs text-ink-muted">
                    {{ post.deck.slides.length }}
                    {{ post.deck.slides.length === 1 ? 'slide' : 'slides' }}
                  </p>
                </div>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-1">
              <SButton v-if="post.isMine" size="sm" variant="ghost" @click="openEdit(post)">
                <template #leading>
                  <Edit3 class="h-3.5 w-3.5" />
                </template>
                Edit
              </SButton>
              <SButton v-if="post.isMine" size="sm" variant="ghost" @click="confirmDelete(post)">
                <template #leading>
                  <Trash2 class="h-3.5 w-3.5 text-red-500" />
                </template>
                Delete
              </SButton>
              <SButton
                v-else-if="tab === 'everyone'"
                size="sm"
                variant="ghost"
                @click="reportPost(post)"
              >
                <template #leading>
                  <Flag class="h-3.5 w-3.5" />
                </template>
                Report
              </SButton>
            </div>
          </div>
        </SCard>
      </div>
    </SPageContainer>

    <SModal
      :open="composerOpen"
      :title="editingPost ? 'Edit community post' : 'New community post'"
      size="lg"
      @close="closeComposer"
    >
      <div class="space-y-5">
        <section class="space-y-2">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
            Post type
          </p>
          <div class="grid gap-2 md:grid-cols-3">
            <label
              v-for="option in kindOptions"
              :key="option.id"
              :class="[
                'flex min-h-[5.25rem] items-start gap-3 rounded-lg border p-3 transition-colors',
                editingPost
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer hover:border-line-strong hover:bg-surface-canvas',
                form.kind === option.id
                  ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-500/10'
                  : 'border-line bg-surface-raised',
              ]"
            >
              <input
                v-model="form.kind"
                type="radio"
                name="community-kind"
                :value="option.id"
                :disabled="!!editingPost"
                class="sr-only"
              />
              <span
                :class="[
                  'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border',
                  form.kind === option.id
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-line bg-surface-base text-ink-muted',
                ]"
              >
                <component :is="option.icon" class="h-4 w-4" />
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold leading-5 text-ink-strong">
                  {{ option.label }}
                </span>
                <span class="mt-1 block text-xs leading-4 text-ink-muted">
                  {{ option.description }}
                </span>
              </span>
            </label>
          </div>
        </section>

        <section class="space-y-2">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
            Visibility
          </p>
          <div class="grid gap-2 md:grid-cols-2">
            <label
              v-for="option in visibilityOptions"
              :key="option.id"
              :class="[
                'flex min-h-[4.75rem] cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:border-line-strong hover:bg-surface-canvas',
                form.visibility === option.id
                  ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-500/10'
                  : 'border-line bg-surface-raised',
              ]"
            >
              <input
                v-model="form.visibility"
                type="radio"
                name="community-visibility"
                :value="option.id"
                class="sr-only"
              />
              <span
                :class="[
                  'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border',
                  form.visibility === option.id
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-line bg-surface-base text-ink-muted',
                ]"
              >
                <component :is="option.icon" class="h-4 w-4" />
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold leading-5 text-ink-strong">
                  {{ option.label }}
                </span>
                <span class="mt-1 block text-xs leading-4 text-ink-muted">
                  {{ option.description }}
                </span>
              </span>
            </label>
          </div>
        </section>

        <SInput
          v-if="form.kind === 'NotationDeck' || form.kind === 'Post'"
          v-model="form.title"
          label="Title"
          placeholder="Sunday recap"
          :required="form.kind === 'NotationDeck'"
        />

        <SInput
          v-if="form.kind === 'FavouriteVerse'"
          v-model="form.verseRef"
          label="Verse reference"
          placeholder="John 3:16"
          required
        />

        <STextarea
          v-model="form.body"
          :label="form.kind === 'FavouriteVerse' ? 'Reflection' : 'Body'"
          placeholder="Write something for the community..."
          :rows="5"
          :required="form.kind !== 'NotationDeck'"
        />

        <SInput v-model="form.tags" label="Tags" placeholder="sermon, sunday, prayer" />

        <section v-if="form.kind === 'NotationDeck'" class="space-y-3">
          <label class="flex flex-col">
            <span class="mb-1 text-xs font-medium text-ink-muted">Notation deck</span>
            <select
              v-model="form.deckId"
              class="h-9 rounded-md border border-line bg-surface-base px-3 text-sm text-ink-strong"
              :disabled="localDecks.length === 0 || !!editingPost?.deck"
            >
              <option v-if="localDecks.length === 0" value="">No decks available</option>
              <option v-for="deck in localDecks" :key="deck.id" :value="deck.id">
                {{ deck.title }}
              </option>
            </select>
          </label>

          <div
            v-if="activeDeck?.slides.length"
            class="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem]"
          >
            <div class="aspect-video overflow-hidden rounded-lg border border-white/15 bg-black">
              <SNotationSlideCanvas :slide="activeDeck.slides[0]" mode="fill" />
            </div>
            <div class="rounded-lg border border-line-subtle bg-surface-canvas p-3">
              <p class="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Preview</p>
              <p class="mt-1 text-sm font-semibold text-ink-strong">{{ activeDeck.title }}</p>
              <p class="mt-1 text-xs text-ink-muted">
                {{ activeDeck.slides.length }}
                {{ activeDeck.slides.length === 1 ? 'slide' : 'slides' }}
              </p>
            </div>
          </div>

          <p
            v-if="deckHasPublicUnsupportedBackground"
            class="text-xs text-red-600 dark:text-red-400"
          >
            Public notation decks cannot include image or data URL slide backgrounds yet. Choose
            Only me or use a preset/solid background.
          </p>
        </section>
      </div>

      <template #footer>
        <SButton variant="secondary" size="sm" @click="closeComposer">Cancel</SButton>
        <SButton
          size="sm"
          :loading="community.isSaving"
          :disabled="submitDisabled"
          @click="submitPost"
        >
          <template #leading>
            <Send class="h-3.5 w-3.5" />
          </template>
          {{ editingPost ? 'Save changes' : 'Share' }}
        </SButton>
      </template>
    </SModal>

    <SModal
      :open="!!pendingDeletePost"
      title="Delete community post?"
      size="sm"
      @close="pendingDeletePost = null"
    >
      <p class="text-sm text-ink-muted">
        This post will be permanently deleted from your community history.
      </p>
      <template #footer>
        <SButton variant="secondary" size="sm" @click="pendingDeletePost = null"> Cancel </SButton>
        <SButton variant="danger" size="sm" @click="executeDelete">Delete</SButton>
      </template>
    </SModal>
  </div>
</template>
