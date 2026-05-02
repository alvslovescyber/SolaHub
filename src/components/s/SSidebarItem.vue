<script setup lang="ts">
  import { computed } from 'vue'
  import type { Component } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import STooltip from './STooltip.vue'
  import SBadge from './SBadge.vue'

  interface Props {
    label: string
    /** Lucide icon component (Kinabase-style stroke icons). */
    icon: Component
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

  const itemClass = computed(() => {
    const lines = [
      'flex items-center gap-2.5 rounded-lg text-[13px] font-normal transition-colors duration-100 select-none w-full',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
      props.collapsed ? 'justify-center h-9 w-9 mx-auto px-0' : 'h-8 px-2',
    ]
    if (active.value) {
      lines.push('s-sidebar-item-active')
      if (props.collapsed) {
        lines.push(
          'rounded-lg bg-black/[0.08] dark:bg-white/[0.08] text-ink-strong dark:text-white'
        )
      }
    } else {
      lines.push(
        'text-ink-muted hover:bg-black/[0.035] dark:hover:bg-white/[0.05] hover:text-ink-strong'
      )
    }
    return lines
  })

  const iconClass = computed(() =>
    props.collapsed ? 'h-4 w-4 shrink-0' : 'h-[15px] w-[15px] shrink-0'
  )
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
      <component :is="icon" :class="iconClass" :stroke-width="2" />
    </button>
  </STooltip>
  <button
    v-else
    type="button"
    :class="itemClass"
    :aria-current="active ? 'page' : undefined"
    @click="go"
  >
    <span
      class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors"
      :class="active ? 's-sidebar-item-active-icon-ring' : ''"
    >
      <component :is="icon" :class="iconClass" :stroke-width="2" />
    </span>
    <span class="truncate flex-1 text-left">{{ label }}</span>
    <SBadge v-if="badge !== undefined" tone="neutral" variant="soft">
      {{ badge }}
    </SBadge>
  </button>
</template>
