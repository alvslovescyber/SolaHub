<script setup lang="ts">
  import { ChevronUp, LogOut, Settings as SettingsIcon, User as UserIcon } from 'lucide-vue-next'
  import SAvatar from './SAvatar.vue'
  import SDropdownMenu from './SDropdownMenu.vue'
  import SDropdownItem from './SDropdownItem.vue'
  import SDivider from './SDivider.vue'

  interface Props {
    name: string
    subtitle?: string
    avatarSrc?: string
    collapsed?: boolean
  }

  defineProps<Props>()
  const emit = defineEmits<{ logout: [] }>()
</script>

<template>
  <SDropdownMenu placement="top-start">
    <template #trigger>
      <button
        type="button"
        :class="[
          'flex items-center gap-2 w-full rounded-md transition-colors',
          'text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
          collapsed ? 'justify-center p-1.5' : 'p-2',
        ]"
      >
        <SAvatar :name="name" :src="avatarSrc" size="sm" rounded="md" />
        <span v-if="!collapsed" class="flex-1 min-w-0 leading-tight">
          <span class="block text-sm font-medium text-ink-strong truncate">{{ name }}</span>
          <span v-if="subtitle" class="block text-xs text-ink-muted truncate">{{ subtitle }}</span>
        </span>
        <ChevronUp v-if="!collapsed" class="h-3.5 w-3.5 text-ink-muted shrink-0" />
      </button>
    </template>

    <SDropdownItem to="/settings">
      <template #leading>
        <UserIcon class="h-3.5 w-3.5" />
      </template>
      Profile
    </SDropdownItem>
    <SDropdownItem to="/settings">
      <template #leading>
        <SettingsIcon class="h-3.5 w-3.5" />
      </template>
      Settings
    </SDropdownItem>
    <div class="my-1">
      <SDivider />
    </div>
    <SDropdownItem danger @click="emit('logout')">
      <template #leading>
        <LogOut class="h-3.5 w-3.5" />
      </template>
      Sign out
    </SDropdownItem>
  </SDropdownMenu>
</template>
