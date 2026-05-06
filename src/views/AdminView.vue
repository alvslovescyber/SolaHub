<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import {
    ShieldCheckIcon,
    UsersIcon,
    ActivityIcon,
    SearchIcon,
    CheckCircle2Icon,
    XCircleIcon,
    RefreshCwIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
  } from 'lucide-vue-next'
  import RoleBadge from '@/components/admin/RoleBadge.vue'
  import StatCard from '@/components/admin/StatCard.vue'
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

  watch([page, search, roleFilter], loadUsers)

  // ─── Recent activity (for overview tab) ───────────────────────────────────────
  const recentUsers = ref<AdminUser[]>([])

  async function loadRecentUsers() {
    try {
      const res = await adminService.getUsers(1, 8)
      recentUsers.value = res.users
    } catch {
      // non-critical
    }
  }

  // ─── User actions ─────────────────────────────────────────────────────────────
  const savingUserId = ref<string | null>(null)
  const confirmDeactivateId = ref<string | null>(null)

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
    // Deactivation requires confirmation
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

  function cancelConfirm(userId: string) {
    if (confirmDeactivateId.value === userId) confirmDeactivateId.value = null
  }

  function applyUserUpdate(updated: AdminUser) {
    if (!usersData.value) return
    const idx = usersData.value.users.findIndex((u) => u.id === updated.id)
    if (idx !== -1) usersData.value.users[idx] = updated
    const rIdx = recentUsers.value.findIndex((u) => u.id === updated.id)
    if (rIdx !== -1) recentUsers.value[rIdx] = updated
    // Refresh stats since active count or role counts may have changed
    void loadStats()
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  function formatDate(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
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

  onMounted(() => {
    void loadStats()
    void loadUsers()
    void loadRecentUsers()
  })
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Page header + tabs -->
    <div class="shrink-0 border-b border-slate-200/70 dark:border-slate-700/50 px-6 pt-5 pb-0">
      <div class="flex items-center gap-2.5 mb-4">
        <ShieldCheckIcon class="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <h1 class="text-lg font-semibold text-slate-900 dark:text-white">Admin</h1>
      </div>

      <!-- Tab bar -->
      <div class="flex gap-1" role="tablist">
        <button
          v-for="tab in [
            { id: 'overview', label: 'Overview', icon: ActivityIcon },
            { id: 'users', label: 'Users', icon: UsersIcon },
          ] as const"
          :key="tab.id"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :class="[
            'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === tab.id
              ? 'border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
          ]"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" class="w-3.5 h-3.5" />
          {{ tab.label }}
          <span
            v-if="tab.id === 'users' && usersData"
            class="ml-1 text-xs font-normal text-muted-foreground"
          >
            {{ usersData.total.toLocaleString() }}
          </span>
        </button>
      </div>
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-auto">
      <!-- ── Overview ─────────────────────────────────────────────────────────── -->
      <div v-if="activeTab === 'overview'" class="p-6 space-y-8">
        <!-- Stats -->
        <section>
          <h2 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Platform stats
          </h2>
          <div v-if="statsLoading" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div v-for="i in 7" :key="i" class="rounded-xl border bg-card p-5 animate-pulse h-20" />
          </div>
          <div v-else-if="stats" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Users" :value="stats.totalUsers" icon="users" />
            <StatCard label="Active Users" :value="stats.activeUsers" icon="check-circle" />
            <StatCard label="Admins" :value="stats.adminUsers" icon="shield" />
            <StatCard label="Churches" :value="stats.totalChurches" icon="church" />
            <StatCard label="Notes" :value="stats.totalNotes" icon="file-text" />
            <StatCard label="Reading Plans" :value="stats.totalPlans" icon="book-open" />
            <StatCard
              label="Community Posts"
              :value="stats.totalCommunityPosts"
              icon="message-square"
            />
          </div>
          <p v-else-if="statsError" class="text-sm text-destructive">{{ statsError }}</p>
        </section>

        <!-- Recent registrations -->
        <section>
          <h2 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Recent members
          </h2>
          <div v-if="recentUsers.length" class="rounded-xl border overflow-hidden">
            <div
              v-for="(user, i) in recentUsers"
              :key="user.id"
              :class="[
                'flex items-center gap-3 px-4 py-3',
                i !== 0 && 'border-t border-slate-100 dark:border-slate-800',
              ]"
            >
              <div
                class="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0"
              >
                {{ initials(user.displayName) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ user.displayName }}</p>
                <p class="text-xs text-muted-foreground truncate">{{ user.email }}</p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <RoleBadge :role="user.role" />
                <span class="text-xs text-muted-foreground">{{ formatDate(user.createdAt) }}</span>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-muted-foreground">No users yet.</p>
        </section>
      </div>

      <!-- ── Users ────────────────────────────────────────────────────────────── -->
      <div v-else-if="activeTab === 'users'" class="p-6 space-y-4">
        <!-- Toolbar -->
        <div class="flex flex-col sm:flex-row gap-3">
          <!-- Search -->
          <div class="relative flex-1">
            <SearchIcon
              class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            />
            <input
              :value="searchRaw"
              type="search"
              placeholder="Search by name or email…"
              class="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition"
              @input="onSearchInput(($event.target as HTMLInputElement).value)"
            />
          </div>

          <!-- Role filter pills -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              :class="[
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                !roleFilter
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400',
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
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400',
              ]"
              @click="setRoleFilter(role)"
            >
              {{ role }}
            </button>
          </div>
        </div>

        <!-- Table -->
        <div class="rounded-xl border overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-muted/40">
              <tr>
                <th
                  class="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide"
                >
                  User
                </th>
                <th
                  class="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell"
                >
                  Joined
                </th>
                <th
                  class="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell"
                >
                  Last login
                </th>
                <th
                  class="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide"
                >
                  Role
                </th>
                <th
                  class="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="usersLoading">
                <td colspan="5" class="px-4 py-10 text-center text-muted-foreground text-sm">
                  <RefreshCwIcon class="w-4 h-4 animate-spin inline-block mr-2" />
                  Loading…
                </td>
              </tr>
              <tr v-else-if="usersError">
                <td colspan="5" class="px-4 py-10 text-center text-destructive text-sm">
                  {{ usersError }}
                </td>
              </tr>
              <tr v-else-if="!usersData?.users.length">
                <td colspan="5" class="px-4 py-10 text-center text-muted-foreground text-sm">
                  No users match your filters.
                </td>
              </tr>
              <tr
                v-for="user in usersData?.users"
                v-else
                :key="user.id"
                :class="[
                  'border-t border-slate-100 dark:border-slate-800 transition-colors',
                  savingUserId === user.id ? 'opacity-60' : 'hover:bg-muted/20',
                ]"
              >
                <!-- User identity -->
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div
                      class="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0"
                    >
                      {{ initials(user.displayName) }}
                    </div>
                    <div class="min-w-0">
                      <p class="font-medium truncate max-w-[160px]">{{ user.displayName }}</p>
                      <p class="text-xs text-muted-foreground truncate max-w-[160px]">
                        {{ user.email }}
                      </p>
                    </div>
                  </div>
                </td>

                <!-- Joined -->
                <td class="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                  {{ formatDate(user.createdAt) }}
                </td>

                <!-- Last login -->
                <td class="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                  {{ formatDate(user.lastLoginAt) }}
                </td>

                <!-- Role selector -->
                <td class="px-4 py-3">
                  <select
                    :value="user.role"
                    :disabled="savingUserId === user.id"
                    class="text-xs rounded-lg border bg-background px-2 py-1 pr-6 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    @change="changeRole(user, ($event.target as HTMLSelectElement).value)"
                  >
                    <option v-for="role in ROLES" :key="role" :value="role">{{ role }}</option>
                  </select>
                </td>

                <!-- Active toggle / confirm deactivate -->
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <!-- Confirm deactivate prompt -->
                    <template v-if="confirmDeactivateId === user.id">
                      <span class="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Confirm?
                      </span>
                      <button
                        class="p-1 rounded text-destructive hover:bg-destructive/10 transition"
                        title="Yes, deactivate"
                        @click="toggleActive(user)"
                      >
                        <CheckCircle2Icon class="w-4 h-4" />
                      </button>
                      <button
                        class="p-1 rounded text-muted-foreground hover:bg-muted transition"
                        title="Cancel"
                        @click="cancelConfirm(user.id)"
                      >
                        <XCircleIcon class="w-4 h-4" />
                      </button>
                    </template>

                    <!-- Normal status badge + toggle -->
                    <template v-else>
                      <button
                        :disabled="savingUserId === user.id"
                        :title="user.isActive ? 'Click to deactivate' : 'Click to activate'"
                        :class="[
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          user.isActive
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50'
                            : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50',
                        ]"
                        @click="toggleActive(user)"
                      >
                        <span
                          :class="[
                            'w-1.5 h-1.5 rounded-full',
                            user.isActive ? 'bg-emerald-500' : 'bg-red-500',
                          ]"
                        />
                        {{ user.isActive ? 'Active' : 'Inactive' }}
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between text-sm">
          <p class="text-muted-foreground">
            <template v-if="usersData">
              Showing
              {{ (page - 1) * PAGE_SIZE + 1 }}–{{ Math.min(page * PAGE_SIZE, usersData.total) }} of
              {{ usersData.total.toLocaleString() }}
            </template>
          </p>
          <div class="flex items-center gap-1.5">
            <button
              :disabled="page <= 1 || usersLoading"
              class="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-muted transition-colors"
              @click="page--"
            >
              <ChevronLeftIcon class="w-3.5 h-3.5" />
              Prev
            </button>
            <span class="px-3 py-1.5 text-muted-foreground">{{ page }}</span>
            <button
              :disabled="!hasNextPage || usersLoading"
              class="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-muted transition-colors"
              @click="page++"
            >
              Next
              <ChevronRightIcon class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
