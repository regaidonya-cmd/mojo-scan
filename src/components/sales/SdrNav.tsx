import { DS } from '@/lib/ds/tokens'

// PR3 — barre minimale de l'espace SDR (aucun lien ADMIN).
export function SdrNav({ nom }: { nom: string }) {
  return (
    <nav style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '10px 20px', borderBottom: `1px solid ${DS.border}`, background: DS.white, fontFamily: DS.fontBody }}>
      <span style={{ fontFamily: DS.fontDisplay, fontWeight: 800, color: DS.night, fontSize: 14, marginRight: 16 }}>MOJO SALES</span>
      <a href="/sdr/prospects" style={{ padding: '7px 14px', borderRadius: DS.rMd, fontSize: 13.5, fontWeight: 700, textDecoration: 'none', color: DS.white, background: DS.grad }}>
        Mes prospects
      </a>
      <span style={{ marginLeft: 'auto', fontSize: 13, color: DS.muted }}>{nom}</span>
      <form method="POST" action="/api/auth/logout" style={{ margin: 0 }}>
        <button type="submit" style={{ padding: '7px 12px', borderRadius: DS.rMd, border: `1.5px solid ${DS.border2}`, background: DS.white, fontSize: 13, cursor: 'pointer' }}>
          Se déconnecter
        </button>
      </form>
    </nav>
  )
}
