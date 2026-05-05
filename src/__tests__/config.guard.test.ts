import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../..')

function readJson(relPath: string): Record<string, unknown> {
  const raw = readFileSync(resolve(root, relPath), 'utf8')
  // Strip line-leading // comments so JSONC files (launch.json, tasks.json) parse cleanly.
  // Uses a line-start anchor so // inside URL strings (e.g. "https://...") is left intact.
  const stripped = raw.replace(/^\s*\/\/[^\n]*/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  return JSON.parse(stripped) as Record<string, unknown>
}

// ─── tauri.conf.json ───────────────────────────────────────────────────────────

describe('tauri.conf.json', () => {
  it('does not contain a hardcoded plugins.updater section', () => {
    // updater config (pubkey + endpoint) is injected by CI (tauri-release.yml).
    // Committing it would embed stale keys in source and break the dev startup —
    // the plugin panics when the section exists but VITE_API_URL / postgres aren't wired.
    const conf = readJson('src-tauri/tauri.conf.json')
    const plugins = conf.plugins as Record<string, unknown> | undefined
    expect(plugins?.updater).toBeUndefined()
  })
})

// ─── .vscode/launch.json ──────────────────────────────────────────────────────

describe('.vscode/launch.json', () => {
  function getTauriDevConfig() {
    const launch = readJson('.vscode/launch.json')
    const configs = launch.configurations as Array<Record<string, unknown>>
    return configs.find((c) => c.name === 'Tauri: Dev')
  }

  it('Tauri: Dev uses request=attach, not request=launch', () => {
    // Bug: request=launch caused tauri dev (preLaunchTask) to start the binary,
    // then lldb-dap launched it AGAIN — two "exec" instances fighting over SQLite.
    const cfg = getTauriDevConfig()
    expect(cfg).toBeDefined()
    expect(cfg!.request).toBe('attach')
  })

  it('Tauri: Dev has waitFor=true so lldb attaches to the running process', () => {
    const cfg = getTauriDevConfig()
    expect(cfg!.waitFor).toBe(true)
  })

  it('Tauri: Dev is not configured to launch with an args array', () => {
    // args is only valid for request=launch; its presence signals the wrong mode.
    const cfg = getTauriDevConfig()
    expect(cfg!.args).toBeUndefined()
  })
})
