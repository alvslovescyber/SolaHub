<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import {
    ShieldCheckIcon,
    UsersIcon,
    ActivityIcon,
    SearchIcon,
    RefreshCwIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XIcon,
    KeyRoundIcon,
    Trash2Icon,
    LogOutIcon,
    CheckIcon,
    AlertTriangleIcon,
    CopyIcon,
    BookOpenIcon,
    FileTextIcon,
    MessageSquareIcon,
    ChurchIcon,
    UserCheckIcon,
    UserXIcon,
  } from 'lucide-vue-next'
  import RoleBadge from '@/components/admin/RoleBadge.vue'
  import {
    adminService,
    type AdminUser,
    type AdminStats,
    type AdminUsersResponse,
  } from '@/services/admin.service'

  // ─── Tabs ─────────────────────────────────────────────────────────────────────
  type Tab = 'overview' | 'users'
  const activeTab = ref<Tab>('overview')

  // ─── Stats ────────────────────────────────────────────────────────────────────
  const stats = ref<AdminStats | null>(null)
  const statsLoading = ref(true)
  const statsError = ref<string | null>(null)

  async function loadStats() {
    statsLoading.value = true
    statsError.value = null
    try {
      stats.value = await adminService.getStats()
    } catch {
      statsError.value = 'Failed to load platform stats.'
    } finally {
      statsLoading.value = false
    }
  }

  // ─── Users ────────────────────────────────────────────────────────────────────
  const usersData = ref<AdminUsersResponse | null>(null)
  const usersLoading = ref(false)
  const usersError = ref<string | null>(null)
  const page = ref(1)
  const PAGE_SIZE = 25

  const searchRaw = ref('')
  const search = ref('')
  const roleFilter = ref('')

  let searchDebounce: ReturnType<typeof setTimeout> | null = null
  function onSearchInput(value: string) {
    searchRaw.value = value
    if (searchDebounce) clearTimeout(searchDebounce)
    searchDebounce = setTimeout(() => {
      search.value = value
      page.value = 1
    }, 300)
  }

  const ROLES = ['Member', 'Presenter', 'Pastor', 'Admin'] as const

  function setRoleFilter(role: string) {
    roleFilter.value = roleFilter.value === role ? '' : role
    page.value = 1
  }

  const hasNextPage = computed(() => {
    if (!usersData.value) return false
    return page.value * PAGE_SIZE < usersData.value.total
  })

  async function loadUsers() {
    usersLoading.value = true
    usersError.value = null
    try {
      usersData.value = await adminService.getUsers(
        page.value,
        PAGE_SIZE,
        search.value || undefined,
        roleFilter.value || undefined
      )
    } catch {
      usersError.value = 'Failed to load users.'
    } finally {
      usersLoading.value = false
    }
  }

  watch([page, search, roleFilter], () => {
    selectedUser.value = null
    void loadUsers()
  })

  // ─── Recent registrations ─────────────────────────────────────────────────────
  const recentUsers = ref<AdminUser[]>([])

  async function loadRecentUsers() {
    try {
      const res = await adminService.getUsers(1, 8)
      recentUsers.value = res.users
    } catch {
      // non-critical
    }
  }

  // ─── Selected user panel ──────────────────────────────────────────────────────
  const selectedUser = ref<AdminUser | null>(null)

  function selectUser(user: AdminUser) {
    if (selectedUser.value?.id === user.id) {
      closePanel()
    } else {
      selectedUser.value = user
      confirmDeactivateId.value = null
      confirmRevokeId.value = null
    }
  }

  function closePanel() {
    selectedUser.value = null
    confirmDeactivateId.value = null
    confirmRevokeId.value = null
  }

  // ─── User actions ─────────────────────────────────────────────────────────────
  const savingUserId = ref<string | null>(null)
  const confirmDeactivateId = ref<string | null>(null)
  const confirmRevokeId = ref<string | null>(null)

  // Reset password modal state
  const resetPwModal = ref({ show: false, loading: false, tempPassword: null as string | null })
  const copiedPassword = ref(false)

  // Delete confirm modal state
  const deleteModal = ref({
    show: false,
    loading: false,
    userId: null as string | null,
    userName: '',
  })
  const deleteConfirmText = ref('')

  async function changeRole(user: AdminUser, newRole: string) {
    if (newRole === user.role) return
    savingUserId.value = user.id
    try {
      const updated = await adminService.updateUser(user.id, { role: newRole })
      applyUserUpdate(updated)
    } finally {
      savingUserId.value = null
    }
  }

  async function toggleActive(user: AdminUser) {
    if (!user.isActive) {
      savingUserId.value = user.id
      try {
        const updated = await adminService.updateUser(user.id, { isActive: true })
        applyUserUpdate(updated)
      } finally {
        savingUserId.value = null
      }
      return
    }
    if (confirmDeactivateId.value !== user.id) {
      confirmDeactivateId.value = user.id
      return
    }
    confirmDeactivateId.value = null
    savingUserId.value = user.id
    try {
      const updated = await adminService.updateUser(user.id, { isActive: false })
      applyUserUpdate(updated)
    } finally {
      savingUserId.value = null
    }
  }

  function cancelConfirmDeactivate() {
    confirmDeactivateId.value = null
  }

  async function revokeSessions(user: AdminUser) {
    if (confirmRevokeId.value !== user.id) {
      confirmRevokeId.value = user.id
      return
    }
    confirmRevokeId.value = null
    savingUserId.value = user.id
    try {
      await adminService.revokeSessions(user.id)
      await loadUsers()
      if (selectedUser.value?.id === user.id) {
        selectedUser.value = usersData.value?.users.find((u) => u.id === user.id) ?? null
      }
    } finally {
      savingUserId.value = null
    }
  }

  function cancelConfirmRevoke() {
    confirmRevokeId.value = null
  }

  async function openResetPassword(user: AdminUser) {
    resetPwModal.value = { show: true, loading: true, tempPassword: null }
    try {
      const { temporaryPassword } = await adminService.resetPassword(user.id)
      resetPwModal.value.tempPassword = temporaryPassword
    } catch {
      resetPwModal.value.show = false
    } finally {
      resetPwModal.value.loading = false
    }
  }

  function closeResetPwModal() {
    resetPwModal.value = { show: false, loading: false, tempPassword: null }
    copiedPassword.value = false
  }

  async function copyPassword() {
    if (!resetPwModal.value.tempPassword) return
    await navigator.clipboard.writeText(resetPwModal.value.tempPassword)
    copiedPassword.value = true
    setTimeout(() => {
      copiedPassword.value = false
    }, 2000)
  }

  function openDeleteModal(user: AdminUser) {
    deleteModal.value = { show: true, loading: false, userId: user.id, userName: user.displayName }
    deleteConfirmText.value = ''
  }

  function closeDeleteModal() {
    deleteModal.value = { show: false, loading: false, userId: null, userName: '' }
    deleteConfirmText.value = ''
  }

  async function confirmDelete() {
    if (!deleteModal.value.userId) return
    deleteModal.value.loading = true
    try {
      await adminService.deleteUser(deleteModal.value.userId)
      const deletedId = deleteModal.value.userId
      if (usersData.value) {
        usersData.value.users = usersData.value.users.filter((u) => u.id !== deletedId)
        usersData.value.total--
      }
      recentUsers.value = recentUsers.value.filter((u) => u.id !== deletedId)
      if (selectedUser.value?.id === deletedId) selectedUser.value = null
      closeDeleteModal()
      void loadStats()
    } finally {
      deleteModal.value.loading = false
    }
  }

  function applyUserUpdate(updated: AdminUser) {
    if (usersData.value) {
      const idx = usersData.value.users.findIndex((u) => u.id === updated.id)
      if (idx !== -1) usersData.value.users[idx] = updated
    }
    const rIdx = recentUsers.value.findIndex((u) => u.id === updated.id)
    if (rIdx !== -1) recentUsers.value[rIdx] = updated
    if (selectedUser.value?.id === updated.id) selectedUser.value = updated
    void loadStats()
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  function formatDate(iso: string | null | undefined, full = false): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (full) {
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
    const diffMs = Date.now() - d.getTime()
    const diffDays = Math.floor(diffMs / 86_400_000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function initials(name: string): string {
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const activeRatio = computed(() => {
    if (!stats.value?.totalUsers) return 0
    return Math.round((stats.value.activeUsers / stats.value.totalUsers) * 100)
  })

  function switchTab(id: Tab) {
    activeTab.value = id
    if (id === 'overview') closePanel()
  }

  onMounted(() => {
    void loadStats()
    void loadUsers()
    void loadRecentUsers()
  })
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden bg-surface-canvas">
    <!-- ── Header + tabs ─────────────────────────────────────────────────────── -->
    <div class="shrink-0 border-b border-line px-6 pt-5 pb-0">
      <div class="flex items-center gap-3 mb-4">
        <div
          class="w-9 h-9 rounded-lg bg-purple-500/10 dark:bg-purple-500/15 flex items-center justify-center shrink-0"
        >
          <ShieldCheckIcon class="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 class="text-base font-semibold text-ink-strong leading-tight">Admin</h1>
          <p class="text-xs text-ink-muted">Manage users and monitor platform activity</p>
        </div>
      </div>

      <nav class="flex gap-0.5" role="tablist">
        <button
          v-for="tab in [
            { id: 'overview', label: 'Overview', icon: ActivityIcon },
            { id: 'users', label: 'Users', icon: UsersIcon },
          ] as const"
          :key="tab.id"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :class="[
            'flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === tab.id
              ? 'border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300'
              : 'border-transparent text-ink-muted hover:text-ink-strong',
          ]"
          @click="switchTab(tab.id)"
        >
          <component :is="tab.icon" class="w-3.5 h-3.5" />
          {{ tab.label }}
          <span
            v-if="tab.id === 'users' && usersData"
            class="ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-normal bg-surface-sunken text-ink-muted"
          >
            {{ usersData.total.toLocaleString() }}
          </span>
        </button>
      </nav>
    </div>

    <!-- ── Tab content ────────────────────────────────────────────────────────── -->
    <div class="flex-1 overflow-hidden">
      <!-- ───── Overview ────────────────────────────────────────────────────── -->
      <div v-if="activeTab === 'overview'" class="h-full overflow-auto p-6 space-y-6">
        <!-- Stats grid -->
        <section>
          <h2 class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">
            Platform Stats
          </h2>

          <div v-if="statsLoading" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              v-for="i in 7"
              :key="i"
              class="rounded-lg border border-line bg-surface-raised p-4 animate-pulse h-24"
            />
          </div>

          <div v-else-if="stats" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <!-- Total Users -->
            <div
              class="rounded-lg border border-line bg-surface-raised p-4 shadow-card flex flex-col gap-2"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-7 h-7 rounded-md bg-blue-500/10 dark:bg-blue-500/15 flex items-center justify-center"
                >
                  <UsersIcon class="w-3.5 h-3.5 text-blue-500" />
                </div>
                <span class="text-xs font-medium text-ink-muted">Total Users</span>
              </div>
              <p class="text-2xl font-bold tabular-nums text-ink-strong">
                {{ stats.totalUsers.toLocaleString() }}
              </p>
            </div>

            <!-- Active Users -->
            <div
              class="rounded-lg border border-line bg-surface-raised p-4 shadow-card flex flex-col gap-2"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-7 h-7 rounded-md bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center"
                >
                  <UserCheckIcon class="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <span class="text-xs font-medium text-ink-muted">Active</span>
              </div>
              <p class="text-2xl font-bold tabular-nums text-ink-strong">
                {{ stats.activeUsers.toLocaleString() }}
              </p>
              <div class="h-1 rounded-full bg-surface-sunken overflow-hidden">
                <div
                  class="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  :style="{ width: `${activeRatio}%` }"
                />
              </div>
              <p class="text-xs text-ink-subtle -mt-1">{{ activeRatio }}% of total</p>
            </div>

            <!-- Admins -->
            <div
              class="rounded-lg border border-line bg-surface-raised p-4 shadow-card flex flex-col gap-2"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-7 h-7 rounded-md bg-purple-500/10 dark:bg-purple-500/15 flex items-center justify-center"
                >
                  <ShieldCheckIcon class="w-3.5 h-3.5 text-purple-500" />
                </div>
                <span class="text-xs font-medium text-ink-muted">Admins</span>
              </div>
              <p class="text-2xl font-bold tabular-nums text-ink-strong">
                {{ stats.adminUsers.toLocaleString() }}
              </p>
            </div>

            <!-- Churches -->
            <div
              class="rounded-lg border border-line bg-surface-raised p-4 shadow-card flex flex-col gap-2"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-7 h-7 rounded-md bg-amber-500/10 dark:bg-amber-500/15 flex items-center justify-center"
                >
                  <ChurchIcon class="w-3.5 h-3.5 text-amber-500" />
                </div>
                <span class="text-xs font-medium text-ink-muted">Churches</span>
              </div>
              <p class="text-2xl font-bold tabular-nums text-ink-strong">
                {{ stats.totalChurches.toLocaleString() }}
              </p>
            </div>

            <!-- Notes -->
            <div
              class="rounded-lg border border-line bg-surface-raised p-4 shadow-card flex flex-col gap-2"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-7 h-7 rounded-md bg-slate-500/10 dark:bg-slate-500/15 flex items-center justify-center"
                >
                  <FileTextIcon class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                </div>
                <span class="text-xs font-medium text-ink-muted">Notes</span>
              </div>
              <p class="text-2xl font-bold tabular-nums text-ink-strong">
                {{ stats.totalNotes.toLocaleString() }}
              </p>
            </div>

            <!-- Reading Plans -->
            <div
              class="rounded-lg border border-line bg-surface-raised p-4 shadow-card flex flex-col gap-2"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-7 h-7 rounded-md bg-indigo-500/10 dark:bg-indigo-500/15 flex items-center justify-center"
                >
                  <BookOpenIcon class="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <span class="text-xs font-medium text-ink-muted">Reading Plans</span>
              </div>
              <p class="text-2xl font-bold tabular-nums text-ink-strong">
                {{ stats.totalPlans.toLocaleString() }}
              </p>
            </div>

            <!-- Community Posts -->
            <div
              class="rounded-lg border border-line bg-surface-raised p-4 shadow-card flex flex-col gap-2"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-7 h-7 rounded-md bg-rose-500/10 dark:bg-rose-500/15 flex items-center justify-center"
                >
                  <MessageSquareIcon class="w-3.5 h-3.5 text-rose-500" />
                </div>
                <span class="text-xs font-medium text-ink-muted">Community Posts</span>
              </div>
              <p class="text-2xl font-bold tabular-nums text-ink-strong">
                {{ stats.totalCommunityPosts.toLocaleString() }}
              </p>
            </div>
          </div>

          <p v-else-if="statsError" class="text-sm" style="color: var(--s-danger-fg)">
            {{ statsError }}
          </p>
        </section>

        <!-- Recent registrations -->
        <section>
          <h2 class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">
            Recent Members
          </h2>

          <div
            v-if="recentUsers.length"
            class="bg-surface-raised border border-line rounded-lg shadow-card overflow-hidden divide-y divide-line-subtle"
          >
            <div
              v-for="user in recentUsers"
              :key="user.id"
              class="flex items-center gap-3 px-4 py-3 hover:bg-surface-sunken transition-colors"
            >
              <div
                class="w-9 h-9 rounded-full bg-purple-500/10 dark:bg-purple-500/15 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400 shrink-0"
              >
                {{ initials(user.displayName) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-ink-strong truncate">{{ user.displayName }}</p>
                <p class="text-xs text-ink-muted truncate">{{ user.email }}</p>
              </div>
              <div class="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <span class="text-xs text-ink-subtle">{{ formatDate(user.createdAt) }}</span>
                <RoleBadge :role="user.role" />
                <span
                  v-if="!user.isEmailVerified"
                  class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                >
                  Unverified
                </span>
                <span
                  v-if="!user.isActive"
                  class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                >
                  Inactive
                </span>
              </div>
            </div>
          </div>

          <p v-else class="text-sm text-ink-muted">No users yet.</p>
        </section>
      </div>

      <!-- ───── Users ───────────────────────────────────────────────────────── -->
      <div v-else-if="activeTab === 'users'" class="h-full flex overflow-hidden">
        <!-- Left: table -->
        <div class="flex flex-col overflow-hidden flex-1 min-w-0">
          <div class="flex flex-col gap-3 p-4 pb-0">
            <!-- Toolbar -->
            <div class="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <div class="relative flex-1">
                <SearchIcon
                  class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted pointer-events-none"
                />
                <input
                  :value="searchRaw"
                  type="search"
                  placeholder="Search by name or email…"
                  class="w-full pl-8 pr-4 py-2 text-sm rounded-lg border border-line bg-surface-raised focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition text-ink-strong placeholder:text-ink-subtle"
                  @input="onSearchInput(($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <button
                  :class="[
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    !roleFilter
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'border-line text-ink-muted hover:border-line-strong hover:text-ink-strong bg-surface-raised',
                  ]"
                  @click="setRoleFilter('')"
                >
                  All
                </button>
                <button
                  v-for="role in ROLES"
                  :key="role"
                  :class="[
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    roleFilter === role
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'border-line text-ink-muted hover:border-line-strong hover:text-ink-strong bg-surface-raised',
                  ]"
                  @click="setRoleFilter(role)"
                >
                  {{ role }}
                </button>
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="flex-1 overflow-auto p-4 pt-3 space-y-3">
            <div class="rounded-lg border border-line bg-surface-raised shadow-card overflow-hidden">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-surface-sunken border-b border-line">
                    <th
                      class="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase tracking-wide"
                    >
                      User
                    </th>
                    <th
                      class="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase tracking-wide hidden md:table-cell"
                    >
                      Role
                    </th>
                    <th
                      class="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase tracking-wide hidden lg:table-cell"
                    >
                      Joined
                    </th>
                    <th
                      class="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase tracking-wide hidden lg:table-cell"
                    >
                      Last Login
                    </th>
                    <th
                      class="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase tracking-wide"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-line-subtle">
                  <tr v-if="usersLoading">
                    <td colspan="5" class="px-4 py-12 text-center text-ink-muted text-sm">
                      <RefreshCwIcon class="w-4 h-4 animate-spin inline-block mr-2 text-ink-subtle" />
                      Loading…
                    </td>
                  </tr>
                  <tr v-else-if="usersError">
                    <td colspan="5" class="px-4 py-12 text-center text-sm" style="color: var(--s-danger-fg)">
                      {{ usersError }}
                    </td>
                  </tr>
                  <tr v-else-if="!usersData?.users.length">
                    <td colspan="5" class="px-4 py-12 text-center text-ink-muted text-sm">
                      No users match your filters.
                    </td>
                  </tr>
                  <tr
                    v-for="user in usersData?.users"
                    v-else
                    :key="user.id"
                    :class="[
                      'cursor-pointer transition-colors',
                      selectedUser?.id === user.id
                        ? 'bg-purple-50 dark:bg-purple-500/10'
                        : savingUserId === user.id
                          ? 'opacity-60'
                          : 'hover:bg-surface-sunken',
                    ]"
                    @click="selectUser(user)"
                  >
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2.5">
                        <div
                          class="w-8 h-8 rounded-full bg-purple-500/10 dark:bg-purple-500/15 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400 shrink-0"
                        >
                          {{ initials(user.displayName) }}
                        </div>
                        <div class="min-w-0">
                          <p class="font-medium text-ink-strong truncate max-w-[140px]">
                            {{ user.displayName }}
                          </p>
                          <p class="text-xs text-ink-muted truncate max-w-[140px]">
                            {{ user.email }}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 hidden md:table-cell">
                      <RoleBadge :role="user.role" />
                    </td>
                    <td class="px-4 py-3 text-xs text-ink-muted hidden lg:table-cell">
                      {{ formatDate(user.createdAt) }}
                    </td>
                    <td class="px-4 py-3 text-xs text-ink-muted hidden lg:table-cell">
                      {{ formatDate(user.lastLoginAt) }}
                    </td>
                    <td class="px-4 py-3">
                      <span
                        :class="[
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                          user.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
                        ]"
                      >
                        <span
                          :class="[
                            'w-1.5 h-1.5 rounded-full',
                            user.isActive ? 'bg-emerald-500' : 'bg-red-500',
                          ]"
                        />
                        {{ user.isActive ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div class="flex items-center justify-between">
              <p class="text-xs text-ink-muted">
                <template v-if="usersData">
                  Showing
                  {{ (page - 1) * PAGE_SIZE + 1 }}–{{
                    Math.min(page * PAGE_SIZE, usersData.total)
                  }}
                  of {{ usersData.total.toLocaleString() }}
                </template>
              </p>
              <div class="flex items-center gap-1">
                <button
                  :disabled="page <= 1 || usersLoading"
                  class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-line text-xs text-ink-muted disabled:opacity-40 hover:bg-surface-sunken transition-colors bg-surface-raised"
                  @click="page--"
                >
                  <ChevronLeftIcon class="w-3.5 h-3.5" />
                  Prev
                </button>
                <span class="px-2.5 py-1.5 text-xs text-ink-muted tabular-nums">{{ page }}</span>
                <button
                  :disabled="!hasNextPage || usersLoading"
                  class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-line text-xs text-ink-muted disabled:opacity-40 hover:bg-surface-sunken transition-colors bg-surface-raised"
                  @click="page++"
                >
                  Next
                  <ChevronRightIcon class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: user detail panel -->
        <Transition name="panel-slide">
          <aside
            v-if="selectedUser"
            class="w-72 shrink-0 border-l border-line flex flex-col overflow-hidden bg-surface-base"
          >
            <!-- Panel header -->
            <div
              class="flex items-center justify-between px-4 py-3 border-b border-line shrink-0"
            >
              <span class="text-xs font-semibold text-ink-muted uppercase tracking-wide"
                >User Details</span
              >
              <button
                class="w-6 h-6 rounded-md flex items-center justify-center text-ink-subtle hover:text-ink-strong hover:bg-surface-sunken transition-colors"
                @click="closePanel"
              >
                <XIcon class="w-3.5 h-3.5" />
              </button>
            </div>

            <div class="flex-1 overflow-auto">
              <!-- Identity -->
              <div
                class="p-5 flex flex-col items-center text-center border-b border-line-subtle"
              >
                <div
                  class="w-14 h-14 rounded-full bg-purple-500/10 dark:bg-purple-500/15 flex items-center justify-center text-lg font-bold text-purple-600 dark:text-purple-400 mb-3"
                >
                  {{ initials(selectedUser.displayName) }}
                </div>
                <p class="text-sm font-semibold text-ink-strong">
                  {{ selectedUser.displayName }}
                </p>
                <p class="text-xs text-ink-muted mt-0.5 break-all">{{ selectedUser.email }}</p>
                <div class="flex items-center gap-1.5 mt-3 flex-wrap justify-center">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                      selectedUser.isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
                    ]"
                  >
                    <span
                      :class="[
                        'w-1.5 h-1.5 rounded-full',
                        selectedUser.isActive ? 'bg-emerald-500' : 'bg-red-500',
                      ]"
                    />
                    {{ selectedUser.isActive ? 'Active' : 'Inactive' }}
                  </span>
                  <span
                    :class="[
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      selectedUser.isEmailVerified
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
                    ]"
                  >
                    {{ selectedUser.isEmailVerified ? 'Verified' : 'Unverified' }}
                  </span>
                  <RoleBadge :role="selectedUser.role" />
                </div>
              </div>

              <!-- Account details -->
              <div class="p-4 border-b border-line-subtle space-y-1">
                <h3
                  class="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2.5"
                >
                  Account Info
                </h3>
                <dl class="space-y-2.5">
                  <div class="flex items-start gap-2">
                    <dt class="text-xs text-ink-muted w-20 shrink-0 pt-px">Joined</dt>
                    <dd class="text-xs text-ink-strong font-medium">
                      {{ formatDate(selectedUser.createdAt, true) }}
                    </dd>
                  </div>
                  <div class="flex items-start gap-2">
                    <dt class="text-xs text-ink-muted w-20 shrink-0 pt-px">Last Login</dt>
                    <dd class="text-xs text-ink-strong font-medium">
                      {{ formatDate(selectedUser.lastLoginAt, true) }}
                    </dd>
                  </div>
                  <div class="flex items-start gap-2">
                    <dt class="text-xs text-ink-muted w-20 shrink-0 pt-px">Church</dt>
                    <dd class="text-xs text-ink-strong font-medium">
                      {{ selectedUser.churchId ? 'Linked' : 'None' }}
                    </dd>
                  </div>
                  <div class="flex items-start gap-2">
                    <dt class="text-xs text-ink-muted w-20 shrink-0 pt-px">Session v</dt>
                    <dd class="text-xs text-ink-muted tabular-nums">
                      {{ selectedUser.sessionVersion }}
                    </dd>
                  </div>
                  <div class="flex items-start gap-2">
                    <dt class="text-xs text-ink-muted w-20 shrink-0 pt-px">User ID</dt>
                    <dd class="text-xs text-ink-subtle font-mono break-all">
                      {{ selectedUser.id.slice(0, 8) }}…
                    </dd>
                  </div>
                </dl>
              </div>

              <!-- Role -->
              <div class="p-4 border-b border-line-subtle">
                <h3
                  class="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2.5"
                >
                  Role
                </h3>
                <select
                  :value="selectedUser.role"
                  :disabled="savingUserId === selectedUser.id"
                  class="w-full text-xs rounded-lg border border-line bg-surface-raised px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition disabled:opacity-50 text-ink-strong cursor-pointer"
                  @change="changeRole(selectedUser, ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="role in ROLES" :key="role" :value="role">{{ role }}</option>
                </select>
              </div>

              <!-- Actions -->
              <div class="p-4 space-y-2">
                <h3
                  class="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2.5"
                >
                  Actions
                </h3>

                <!-- Deactivate confirm -->
                <template v-if="confirmDeactivateId === selectedUser.id">
                  <div
                    class="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3"
                  >
                    <p class="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                      Deactivate this user?
                    </p>
                    <p class="text-xs text-amber-600/80 dark:text-amber-500/70 mb-3 leading-relaxed">
                      They'll be signed out immediately and cannot log back in until reactivated.
                    </p>
                    <div class="flex gap-2">
                      <button
                        class="flex-1 py-1.5 rounded-md text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                        @click="toggleActive(selectedUser)"
                      >
                        Deactivate
                      </button>
                      <button
                        class="flex-1 py-1.5 rounded-md text-xs font-medium border border-line bg-surface-raised text-ink-muted hover:bg-surface-sunken transition-colors"
                        @click="cancelConfirmDeactivate"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <button
                    :disabled="savingUserId === selectedUser.id"
                    :class="[
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50',
                      selectedUser.isActive
                        ? 'border-line bg-surface-raised text-ink-strong hover:bg-surface-sunken'
                        : 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100',
                    ]"
                    @click="toggleActive(selectedUser)"
                  >
                    <component
                      :is="selectedUser.isActive ? UserXIcon : UserCheckIcon"
                      class="w-3.5 h-3.5"
                    />
                    {{ selectedUser.isActive ? 'Deactivate Account' : 'Activate Account' }}
                  </button>
                </template>

                <!-- Revoke sessions confirm -->
                <template v-if="confirmRevokeId === selectedUser.id">
                  <div
                    class="rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 p-3"
                  >
                    <p class="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                      Revoke all sessions?
                    </p>
                    <p class="text-xs text-blue-600/80 dark:text-blue-500/70 mb-3 leading-relaxed">
                      User will be signed out of all devices immediately.
                    </p>
                    <div class="flex gap-2">
                      <button
                        class="flex-1 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        @click="revokeSessions(selectedUser)"
                      >
                        Revoke
                      </button>
                      <button
                        class="flex-1 py-1.5 rounded-md text-xs font-medium border border-line bg-surface-raised text-ink-muted hover:bg-surface-sunken transition-colors"
                        @click="cancelConfirmRevoke"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <button
                    :disabled="savingUserId === selectedUser.id"
                    class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-line bg-surface-raised text-ink-strong hover:bg-surface-sunken transition-colors disabled:opacity-50"
                    @click="revokeSessions(selectedUser)"
                  >
                    <LogOutIcon class="w-3.5 h-3.5" />
                    Revoke Active Sessions
                  </button>
                </template>

                <button
                  :disabled="savingUserId === selectedUser.id || resetPwModal.loading"
                  class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-line bg-surface-raised text-ink-strong hover:bg-surface-sunken transition-colors disabled:opacity-50"
                  @click="openResetPassword(selectedUser)"
                >
                  <KeyRoundIcon class="w-3.5 h-3.5" />
                  Reset Password
                </button>

                <div class="pt-1 border-t border-line-subtle mt-1">
                  <button
                    :disabled="savingUserId === selectedUser.id"
                    class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    @click="openDeleteModal(selectedUser)"
                  >
                    <Trash2Icon class="w-3.5 h-3.5" />
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </Transition>
      </div>
    </div>

    <!-- ── Reset Password Modal ───────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="resetPwModal.show"
          class="fixed inset-0 flex items-center justify-center p-4"
          style="z-index: var(--s-z-modal); background: rgba(0, 0, 0, 0.5)"
          @click.self="closeResetPwModal"
        >
          <div class="bg-surface-base rounded-xl shadow-modal w-full max-w-sm p-6 animate-pop-in">
            <div class="flex items-center gap-3 mb-5">
              <div
                class="w-9 h-9 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 flex items-center justify-center shrink-0"
              >
                <KeyRoundIcon class="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-ink-strong">Password Reset</h3>
                <p class="text-xs text-ink-muted">Share this temporary password with the user</p>
              </div>
            </div>

            <div v-if="resetPwModal.loading" class="flex items-center justify-center py-8">
              <RefreshCwIcon class="w-5 h-5 animate-spin text-ink-muted" />
            </div>

            <template v-else-if="resetPwModal.tempPassword">
              <div
                class="bg-surface-sunken border border-line rounded-lg px-3 py-2.5 flex items-center gap-2 mb-3"
              >
                <code class="flex-1 text-sm font-mono text-ink-strong tracking-widest">
                  {{ resetPwModal.tempPassword }}
                </code>
                <button
                  :title="copiedPassword ? 'Copied!' : 'Copy'"
                  class="w-7 h-7 rounded-md flex items-center justify-center transition-colors shrink-0"
                  :class="
                    copiedPassword
                      ? 'text-emerald-500'
                      : 'text-ink-muted hover:text-ink-strong hover:bg-surface-canvas'
                  "
                  @click="copyPassword"
                >
                  <CheckIcon v-if="copiedPassword" class="w-3.5 h-3.5" />
                  <CopyIcon v-else class="w-3.5 h-3.5" />
                </button>
              </div>
              <p class="text-xs text-ink-muted leading-relaxed mb-5">
                The user's password has been changed and their sessions invalidated. This temporary
                password is shown only once — copy it before closing.
              </p>
            </template>

            <button
              class="w-full py-2 rounded-lg text-sm font-medium bg-surface-sunken border border-line text-ink-strong hover:bg-surface-canvas transition-colors"
              @click="closeResetPwModal"
            >
              Done
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Delete Confirm Modal ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="deleteModal.show"
          class="fixed inset-0 flex items-center justify-center p-4"
          style="z-index: var(--s-z-modal); background: rgba(0, 0, 0, 0.5)"
          @click.self="closeDeleteModal"
        >
          <div class="bg-surface-base rounded-xl shadow-modal w-full max-w-sm p-6 animate-pop-in">
            <div class="flex items-center gap-3 mb-5">
              <div
                class="w-9 h-9 rounded-lg bg-red-500/10 dark:bg-red-500/15 flex items-center justify-center shrink-0"
              >
                <AlertTriangleIcon class="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-ink-strong">Delete Account</h3>
                <p class="text-xs text-ink-muted">This action cannot be undone</p>
              </div>
            </div>

            <p class="text-sm text-ink-strong leading-relaxed mb-4">
              You are about to permanently delete
              <strong>{{ deleteModal.userName }}</strong>'s account and all associated data.
            </p>

            <div class="mb-5">
              <label class="text-xs text-ink-muted mb-1.5 block">
                Type <strong class="text-ink-strong font-mono">delete</strong> to confirm
              </label>
              <input
                v-model="deleteConfirmText"
                type="text"
                placeholder="delete"
                class="w-full px-3 py-2 text-sm rounded-lg border border-line bg-surface-raised focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition text-ink-strong placeholder:text-ink-subtle"
              />
            </div>

            <div class="flex gap-2">
              <button
                :disabled="deleteConfirmText !== 'delete' || deleteModal.loading"
                class="flex-1 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                @click="confirmDelete"
              >
                <RefreshCwIcon v-if="deleteModal.loading" class="w-3.5 h-3.5 animate-spin" />
                <Trash2Icon v-else class="w-3.5 h-3.5" />
                Delete Account
              </button>
              <button
                :disabled="deleteModal.loading"
                class="flex-1 py-2 rounded-lg text-sm font-medium border border-line bg-surface-raised text-ink-muted hover:bg-surface-sunken transition-colors"
                @click="closeDeleteModal"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
  .panel-slide-enter-active,
  .panel-slide-leave-active {
    transition:
      transform var(--s-ease-base),
      opacity var(--s-ease-base);
  }
  .panel-slide-enter-from,
  .panel-slide-leave-to {
    transform: translateX(20px);
    opacity: 0;
  }

  .modal-fade-enter-active,
  .modal-fade-leave-active {
    transition: opacity var(--s-ease-base);
  }
  .modal-fade-enter-from,
  .modal-fade-leave-to {
    opacity: 0;
  }
</style>
