<script setup lang="ts">
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import type { LucideIcon } from 'lucide-vue-next'
  import STooltip from './STooltip.vue'
  import SBadge from './SBadge.vue'

  interface Props {
    label: string
    icon: LucideIcon
    routeName?: string
    href?: string
    collapsed?: boolean
    badge?: string | number
    exact?: boolean
  }

  const props = defineProps<Props>()

  const route = useRoute()
  const router = useRouter()

  const active = computed(() => {
    if (!props.routeName) return false
    if (props.exact) return route.name === props.routeName
    return route.name === props.routeName || route.matched.some((m) => m.name === props.routeName)
  })

  function go() {
    if (props.routeName) void router.push({ name: props.routeName })
    else if (props.href) window.open(props.href, '_blank')
  }

  const itemClass = computed(() => [
    'flex items-center gap-2 h-[28px] rounded-md text-[13px] font-medium transition-colors duration-100 select-none w-full',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
    props.collapsed ? 'justify-center px-0' : 'px-2',
    active.value
      ? 's-sidebar-item-active'
      : 'text-ink hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-ink-strong',
  ])
</script>

<template>
  <STooltip v-if="collapsed" :label="label" placement="right">
    <button
      type="button"
      :class="itemClass"
      :aria-label="label"
      :aria-current="active ? 'page' : undefined"
      @click="go"
    >
      <component :is="icon" class="h-[15px] w-[15px] shrink-0 stroke-[1.75]" />
    </button>
  </STooltip>
  <button
    v-else
    type="button"
    :class="itemClass"
    :aria-current="active ? 'page' : undefined"
    @click="go"
  >
    <component :is="icon" class="h-[15px] w-[15px] shrink-0 stroke-[1.75]" />
    <span class="truncate flex-1 text-left">{{ label }}</span>
    <SBadge v-if="badge !== undefined" tone="neutral" variant="soft">
      {{ badge }}
    </SBadge>
  </button>
</template>
