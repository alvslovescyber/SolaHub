import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from './routes'
import { registerGuards } from './guards'

const router = createRouter({
  // Hash history works reliably in Tauri (no server-side routing needed)
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

registerGuards(router)

export default router
