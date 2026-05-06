<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { ShieldCheckIcon } from 'lucide-vue-next'
  import RoleBadge from '@/components/admin/RoleBadge.vue'
  import StatCard from '@/components/admin/StatCard.vue'
  import { adminService, type AdminStats, type AdminUsersResponse } from '@/services/admin.service'

  // ─── Stats ────────────────────────────────────────────────────────────────────
  const stats = ref<AdminStats | null>(null)
  const statsLoading = ref(true)
  const statsError = ref<string | null>(null)

  // ─── Users ────────────────────────────────────────────────────────────────────
  const usersData = ref<AdminUsersResponse | null>(null)
  const usersLoading = ref(true)
  const usersError = ref<string | null>(null)
  const page = ref(1)
  const PAGE_SIZE = 20

  const hasNextPage = computed(() => {
    if (!usersData.value) return false
    return page.value * PAGE_SIZE < usersData.value.total
  })

  async function loadStats() {
    statsLoading.value = true
    statsError.value = null
    try {
      stats.value = await adminService.getStats()
    } catch {
      statsError.value = 'Failed to load stats.'
    } finally {
      statsLoading.value = false
    }
  }

  async function loadUsers() {
    usersLoading.value = true
    usersError.value = null
    try {
      usersData.value = await adminService.getUsers(page.value, PAGE_SIZE)
    } catch {
      usersError.value = 'Failed to load users.'
    } finally {
      usersLoading.value = false
    }
  }

  watch(page, loadUsers)

  onMounted(() => {
    void loadStats()
    void loadUsers()
  })

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <!-- Header -->
    <header class="border-b px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <ShieldCheckIcon class="w-6 h-6 text-primary" />
        <h1 class="text-xl font-semibold">Admin Panel</h1>
      </div>
      <RouterLink
        to="/"
        class="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Back to app
      </RouterLink>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <!-- Stats -->
      <section class="space-y-3">
        <h2 class="text-sm font-medium text-muted-foreground uppercase tracking-wider">Overview</h2>
        <div v-if="statsLoading" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div v-for="i in 7" :key="i" class="rounded-xl border bg-card p-5 animate-pulse h-20" />
        </div>
        <div v-else-if="stats" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

      <!-- Users table -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Users
            <span v-if="usersData" class="ml-1 text-foreground">({{ usersData.total }})</span>
          </h2>
          <div class="flex items-center gap-2">
            <button
              :disabled="page <= 1 || usersLoading"
              class="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-muted transition-colors"
              @click="page--"
            >
              Previous
            </button>
            <span class="text-sm text-muted-foreground px-2">Page {{ page }}</span>
            <button
              :disabled="!hasNextPage || usersLoading"
              class="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-muted transition-colors"
              @click="page++"
            >
              Next
            </button>
          </div>
        </div>

        <div class="rounded-xl border overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-muted/50">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th class="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th class="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th class="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th class="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                <th class="text-left px-4 py-3 font-medium text-muted-foreground">Last Login</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="usersLoading">
                <td colspan="6" class="px-4 py-8 text-center text-muted-foreground">Loading…</td>
              </tr>
              <tr v-else-if="usersError">
                <td colspan="6" class="px-4 py-8 text-center text-destructive text-sm">
                  {{ usersError }}
                </td>
              </tr>
              <tr
                v-for="user in usersData?.users"
                v-else
                :key="user.id"
                class="border-t hover:bg-muted/30 transition-colors"
              >
                <td class="px-4 py-3 font-medium">{{ user.displayName }}</td>
                <td class="px-4 py-3 text-muted-foreground">{{ user.email }}</td>
                <td class="px-4 py-3">
                  <RoleBadge :role="user.role" />
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="
                      user.isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    "
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :class="user.isActive ? 'bg-emerald-500' : 'bg-red-500'"
                    />
                    {{ user.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ formatDate(user.createdAt) }}</td>
                <td class="px-4 py-3 text-muted-foreground">
                  {{ user.lastLoginAt ? formatDate(user.lastLoginAt) : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </div>
</template>
