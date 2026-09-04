'use client'
import type { ScanMode } from '@/types'

export function ModeTag({ mode }: { mode: ScanMode }) {
  if (mode === 'site') return null
  const label = mode === 'terrain' ? 'Terrain' : 'Call'
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px',
      borderRadius: 999, background: 'rgba(255,193,7,0.15)',
      border: '1px solid rgba(255,193,7,0.3)', color: '#FFC107',
      letterSpacing: '0.05em', textTransform: 'uppercase' as const
    }}>{label}</span>
  )
}
