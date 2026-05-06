<script setup lang="ts">
  import { computed, type Component } from 'vue'
  import {
    BookOpenIcon,
    CheckCircleIcon,
    ChurchIcon,
    FileTextIcon,
    MessageSquareIcon,
    ShieldIcon,
    UsersIcon,
  } from 'lucide-vue-next'

  const props = withDefaults(
    defineProps<{
      label: string
      value: number
      icon?: string
    }>(),
    {
      icon: 'users',
    }
  )

  const icons: Record<string, Component> = {
    users: UsersIcon,
    'check-circle': CheckCircleIcon,
    shield: ShieldIcon,
    church: ChurchIcon,
    'file-text': FileTextIcon,
    'book-open': BookOpenIcon,
    'message-square': MessageSquareIcon,
  }

  const iconComponent = computed(() => icons[props.icon] ?? UsersIcon)
</script>

<template>
  <div class="rounded-xl border bg-card p-5 space-y-2">
    <div class="flex items-center gap-2 text-muted-foreground">
      <component :is="iconComponent" class="w-4 h-4" />
      <span class="text-xs font-medium">{{ label }}</span>
    </div>
    <p class="text-2xl font-bold tabular-nums">{{ value.toLocaleString() }}</p>
  </div>
</template>
