<script setup lang="ts">
  import sunIcon from '@/assets/brand/sun-icon-1024.png'

  interface Props {
    size?: number
  }

  const { size = 28 } = defineProps<Props>()
</script>

<template>
  <img
    :src="sunIcon"
    :width="size"
    :height="size"
    alt="SolaHub"
    class="block select-none"
    draggable="false"
  />
</template>
