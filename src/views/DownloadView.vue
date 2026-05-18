<script setup lang="ts">
  import { DownloadIcon, ArrowLeftIcon, ExternalLinkIcon } from 'lucide-vue-next'

  const WEBSITE_URL = 'https://solahub.org'
  const version = '0.1.14'
  const GH_BASE = `https://github.com/alvslovescyber/SolaHub/releases/download/v${version}`

  const downloads = {
    macArm: `${GH_BASE}/SolaHub_${version}_aarch64.dmg`,
    macIntel: `${GH_BASE}/SolaHub_${version}_x64.dmg`,
    windowsExe: `${GH_BASE}/SolaHub_${version}_x64-setup.exe`,
  }

  function openWebsite() {
    window.open(`${WEBSITE_URL}/#download`, '_blank', 'noopener,noreferrer')
  }
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16">
    <div class="max-w-2xl w-full text-center space-y-8">
      <!-- Wordmark -->
      <div class="space-y-2">
        <h1 class="text-4xl font-bold tracking-tight">SolaHub Desktop</h1>
        <p class="text-muted-foreground text-lg">
          Download the native app for the full experience — offline Bible, presenter mode, and more.
        </p>
      </div>

      <!-- Primary CTA: always direct to website for latest version -->
      <div class="flex flex-col items-center gap-3">
        <button
          class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          @click="openWebsite"
        >
          <ExternalLinkIcon class="w-4 h-4" />
          Get the latest version at solahub.org
        </button>
        <p class="text-xs text-muted-foreground">Always up to date · Free · No account required</p>
      </div>

      <div class="relative flex items-center gap-3">
        <div class="flex-1 h-px bg-border" />
        <span class="text-xs text-muted-foreground shrink-0"
          >or download v{{ version }} directly</span
        >
        <div class="flex-1 h-px bg-border" />
      </div>

      <!-- Direct download cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <p class="text-xs text-muted-foreground">macOS 13 Ventura or later</p>
            </div>
          </div>
          <div class="space-y-2">
            <a
              :href="downloads.macArm"
              class="flex items-center justify-between w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <span>Apple Silicon (M1+)</span>
              <DownloadIcon class="w-4 h-4" />
            </a>
            <a
              :href="downloads.macIntel"
              class="flex items-center justify-between w-full px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              <span>Intel Mac</span>
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
              <p class="text-xs text-muted-foreground">Windows 10 / 11 · 64-bit</p>
            </div>
          </div>
          <div class="space-y-2">
            <a
              :href="downloads.windowsExe"
              class="flex items-center justify-between w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <span>Installer (.exe)</span>
              <DownloadIcon class="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      <!-- Footer links -->
      <p class="text-sm text-muted-foreground">
        <a
          :href="`https://github.com/alvslovescyber/SolaHub/releases/tag/v${version}`"
          target="_blank"
          rel="noopener noreferrer"
          class="underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Release notes
        </a>
        &nbsp;·&nbsp;
        <a
          href="https://github.com/alvslovescyber/SolaHub/releases"
          target="_blank"
          rel="noopener noreferrer"
          class="underline underline-offset-4 hover:text-foreground transition-colors"
        >
          All releases
        </a>
        &nbsp;·&nbsp;
        <a
          :href="WEBSITE_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="underline underline-offset-4 hover:text-foreground transition-colors"
        >
          solahub.org
        </a>
      </p>

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
