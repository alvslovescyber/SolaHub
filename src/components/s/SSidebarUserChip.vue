<script setup lang="ts">
  import { ChevronUp, LogOut, Settings, User } from 'lucide-vue-next'
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
  <SDropdownMenu
    placement="top-start"
    full-width
  >
    <template #trigger>
      <button
        type="button"
        :class="[
          'flex items-center gap-2 w-full transition-colors border border-transparent border-x-0',
          'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
          collapsed
            ? 'justify-center p-1.5 rounded-lg'
            : 'px-3 py-2.5 rounded-none dark:bg-white/[0.04]',
        ]"
      >
        <SAvatar
          :name="name"
          :src="avatarSrc"
          size="sm"
          rounded="md"
        />
        <span
          v-if="!collapsed"
          class="flex-1 min-w-0 leading-tight text-left"
        >
          <span class="block text-[13px] font-medium text-ink-strong truncate">{{ name }}</span>
          <span
            v-if="subtitle"
            class="block text-[11px] text-ink-muted truncate"
          >{{
            subtitle
          }}</span>
        </span>
        <ChevronUp
          v-if="!collapsed"
          class="h-3 w-3 shrink-0 text-ink-muted opacity-80"
          stroke-width="2"
        />
      </button>
    </template>

    <SDropdownItem to="/settings">
      <template #leading>
        <User
          class="h-[13px] w-[13px] opacity-90"
          stroke-width="2"
        />
      </template>
      Profile
    </SDropdownItem>
    <SDropdownItem to="/settings">
      <template #leading>
        <Settings
          class="h-[13px] w-[13px] opacity-90"
          stroke-width="2"
        />
      </template>
      Settings
    </SDropdownItem>
    <div class="my-1">
      <SDivider />
    </div>
    <SDropdownItem
      danger
      @click="emit('logout')"
    >
      <template #leading>
        <LogOut
          class="h-[13px] w-[13px]"
          stroke-width="2"
        />
      </template>
      Sign out
    </SDropdownItem>
  </SDropdownMenu>
</template>
