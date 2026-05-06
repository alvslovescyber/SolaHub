import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import App from '@/App.vue'
import { isMac, isTauri, isWindows } from '@/lib/platform'
import '@/assets/styles/main.css'

if (isTauri) {
  document.documentElement.classList.add('is-tauri')
}
if (isMac) {
  document.documentElement.classList.add('is-mac')
}
if (isWindows) {
  document.documentElement.classList.add('is-windows')
}

// On Windows, the window is `transparent: true` and the CSS body background is
// transparent. This means the window is fully invisible for ~100ms before Vue
// renders AppLayout's semi-transparent dark background — users see it as the
// app "opening then closing." Setting an immediate background on #app prevents
// this. The glass/acrylic effect still works: AppLayout's bg-slate-950/[0.78]
// renders on top and the OS acrylic shows through its transparent edges.
if (isTauri && isWindows) {
  const root = document.getElementById('app')
  if (root) root.style.background = 'rgb(2, 6, 23)'
}

// Presenter display window: black background from the very first paint so
// the macOS rounded-corner/transparency artifacts never appear.
if (window.location.hash.startsWith('#/presenter-display')) {
  document.documentElement.classList.add('is-presenter-display')
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.config.errorHandler = (err, _instance, info) => {
  console.error('[SolaHub Error]', err, info)
}

app.mount('#app')
