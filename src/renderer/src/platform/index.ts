/**
 * Auto-selects the active platform implementation. The Electron preload
 * script exposes `window.api`; if it's missing, we're running in a plain
 * browser tab and use the web implementation.
 *
 * The `__APP_TARGET__` constant is replaced at build time by Vite — the web
 * build forces `'web'` so we never accidentally try to call `window.api` even
 * if some browser injects a global of that name.
 */
import type { Platform } from './types'
import { electronPlatform } from './electron'
import { webPlatform } from './web'

declare const __APP_TARGET__: 'electron' | 'web' | undefined

function selectPlatform(): Platform {
  if (typeof __APP_TARGET__ !== 'undefined' && __APP_TARGET__ === 'web') {
    return webPlatform
  }
  if (typeof window !== 'undefined' && (window as { api?: unknown }).api) {
    return electronPlatform
  }
  return webPlatform
}

export const platform: Platform = selectPlatform()

export type { Platform, ReportFormat, SaveResult, OpenResult, SampleEntry } from './types'
