'use client'

import { DS } from '@/lib/ds/tokens'

export function SalesNav({ active }: { active: 'ma-journee' | 'prospects' }) {
  const items: { id: 'ma-journee' | 'prospects'; label: string; href: string; disabled?: boolean }[] = [
    { id: 'ma-journee', label: 'Ma journée', href: '/admin/ma-journee' },
    { id: 'prospects', label: 'Prospects', href: '/admin/prospects' },
  ]
  return (
    <nav
      style={{
        display: 'flex',
        gap: 4,
        padding: '10px 20px',
        borderBottom: `1px solid ${DS.border}`,
        background: DS.white,
        fontFamily: DS.fontBody,
      }}
    >
      <span style={{ fontFamily: DS.fontDisplay, fontWeight: 800, color: DS.night, fontSize: 14, marginRight: 16, alignSelf: 'center' }}>
        MOJO SALES
      </span>
      {items.map((it) => (
        <a
          key={it.id}
          href={it.href}
          style={{
            padding: '7px 14px',
            borderRadius: DS.rMd,
            fontSize: 13.5,
            fontWeight: 700,
            textDecoration: 'none',
            color: active === it.id ? DS.white : DS.violet,
            background: active === it.id ? DS.grad : 'transparent',
          }}
        >
          {it.label}
        </a>
      ))}
      <span
        style={{
          padding: '7px 14px',
          borderRadius: DS.rMd,
          fontSize: 13.5,
          fontWeight: 700,
          color: DS.subtle,
          cursor: 'default',
        }}
      >
        Pipeline
      </span>
    </nav>
  )
}
