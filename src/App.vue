<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()

onMounted(() => {
  ui.initTheme()
})
</script>

<template>
  <RouterView />
</template>
