import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import App from '@/App.vue'
import { isMac, isTauri } from '@/lib/platform'
import '@/assets/styles/main.css'

if (isTauri) {
  document.documentElement.classList.add('is-tauri')
}
if (isMac) {
  document.documentElement.classList.add('is-mac')
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.config.errorHandler = (err, _instance, info) => {
  console.error('[SolaHub Error]', err, info)
}

app.mount('#app')
