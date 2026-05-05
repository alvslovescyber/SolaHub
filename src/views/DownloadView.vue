<script setup lang="ts">
  import { DownloadIcon, ArrowLeftIcon } from 'lucide-vue-next'

  const version = '0.1.1'
  const REPO = 'alvslovescyber/SolaHub'

  function downloadUrl(format: 'dmg' | 'exe' | 'msi', arch: 'aarch64' | 'x64'): string {
    const base = `https://github.com/${REPO}/releases/download/v${version}`
    const tag = `SolaHub_${version}`
    switch (format) {
      case 'dmg':
        return `${base}/${tag}_${arch}.dmg`
      case 'exe':
        return `${base}/${tag}_x64-setup.exe`
      case 'msi':
        return `${base}/${tag}_x64_en-US.msi`
    }
  }
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16">
    <div class="max-w-2xl w-full text-center space-y-8">
      <!-- Logo / wordmark -->
      <div class="space-y-2">
        <h1 class="text-4xl font-bold tracking-tight">SolaHub Desktop</h1>
        <p class="text-muted-foreground text-lg">
          Download the native app for the full experience — offline Bible, presenter mode, and more.
        </p>
      </div>

      <!-- Beta badge -->
      <div
        class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium"
      >
        <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        Beta — version {{ version }}
      </div>

      <!-- Download cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <!-- macOS -->
        <div
          class="rounded-xl border bg-card p-6 text-left space-y-4 hover:border-primary/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
                />
              </svg>
            </div>
            <div>
              <p class="font-semibold">macOS</p>
              <p class="text-xs text-muted-foreground">macOS 10.15+</p>
            </div>
          </div>
          <div class="space-y-2">
            <a
              :href="downloadUrl('dmg', 'aarch64')"
              class="flex items-center justify-between w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <span>Apple Silicon (M1+)</span>
              <DownloadIcon class="w-4 h-4" />
            </a>
            <a
              :href="downloadUrl('dmg', 'x64')"
              class="flex items-center justify-between w-full px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              <span>Intel (x64)</span>
              <DownloadIcon class="w-4 h-4" />
            </a>
          </div>
        </div>

        <!-- Windows -->
        <div
          class="rounded-xl border bg-card p-6 text-left space-y-4 hover:border-primary/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M3 12V6.75l6-1.32v6.57H3zm17 0V5.25L11 4v8H20zM3 13h6v6.57l-6-1.32V13zm17 0v7.75L11 20v-7h9z"
                />
              </svg>
            </div>
            <div>
              <p class="font-semibold">Windows</p>
              <p class="text-xs text-muted-foreground">Windows 10+</p>
            </div>
          </div>
          <div class="space-y-2">
            <a
              :href="downloadUrl('exe', 'x64')"
              class="flex items-center justify-between w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <span>Installer (.exe)</span>
              <DownloadIcon class="w-4 h-4" />
            </a>
            <a
              :href="downloadUrl('msi', 'x64')"
              class="flex items-center justify-between w-full px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              <span>MSI Package</span>
              <DownloadIcon class="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      <!-- Release notes link -->
      <p class="text-sm text-muted-foreground">
        View
        <a
          :href="`https://github.com/alvslovescyber/SolaHub/releases/tag/v${version}`"
          target="_blank"
          rel="noopener noreferrer"
          class="underline underline-offset-4 hover:text-foreground transition-colors"
        >
          release notes
        </a>
        &nbsp;·&nbsp; All releases on
        <a
          href="https://github.com/alvslovescyber/SolaHub/releases"
          target="_blank"
          rel="noopener noreferrer"
          class="underline underline-offset-4 hover:text-foreground transition-colors"
        >
          GitHub
        </a>
      </p>

      <!-- Back to web -->
      <RouterLink
        to="/login"
        class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon class="w-3.5 h-3.5" />
        Use the web app instead
      </RouterLink>
    </div>
  </div>
</template>
