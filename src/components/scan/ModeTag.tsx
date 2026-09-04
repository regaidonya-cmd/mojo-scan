'use client'

import type { ScanMode } from '@/types'

const CONFIG: Record<ScanMode, { label: string; className: string }> = {
  site:    { label: 'Auto-diagnostic',   className: 'bg-neutral-100 text-neutral-500' },
  terrain: { label: 'Mode Terrain',      className: 'bg-amber-100  text-amber-700'   },
  call:    { label: 'Mode Call',         className: 'bg-blue-100   text-blue-700'    },
}

export function ModeTag({ mode }: { mode: ScanMode }) {
  const { label, className } = CONFIG[mode]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${className}`}>
      {label}
    </span>
  )
}
