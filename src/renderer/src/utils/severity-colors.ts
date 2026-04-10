/**
 * Severity color tokens used by the canvas glow overlay and finding cards.
 * Keep in sync with FindingsPanel.
 */
import type { Severity } from '@shared/types/knowledge'

export const SEVERITY_HEX: Record<Severity, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#2563eb',
  informational: '#64748b'
}

export const SEVERITY_RGB: Record<Severity, string> = {
  critical: '220, 38, 38',
  high: '234, 88, 12',
  medium: '202, 138, 4',
  low: '37, 99, 235',
  informational: '100, 116, 139'
}

export function severityGlowShadow(severity: Severity): string {
  const rgb = SEVERITY_RGB[severity]
  return `0 0 32px 8px rgba(${rgb}, 0.55), 0 0 12px 2px rgba(${rgb}, 0.85)`
}

export function severityGlowFilter(severity: Severity): string {
  const hex = SEVERITY_HEX[severity]
  return `drop-shadow(0 0 6px ${hex}) drop-shadow(0 0 12px ${hex})`
}
