import Link from 'next/link'
import { DS } from '@/lib/ds/tokens'
import type { ProspectViewModel } from '@/lib/priority/fetch-real'

const NBA_LABEL: Record<string, string> = {
  CALL: 'Appeler',
  EMAIL: 'Envoyer un email',
  QUALIFY: 'Qualifier',
  PREPARE_RDV: 'Préparer le RDV',
  FOLLOW_UP: 'Relancer',
  SEND_PROPOSAL: 'Envoyer une proposition',
  WAIT: 'Attendre',
  NURTURE: 'Nurture',
  NO_ACTION: 'Aucune action',
  NO_ACTION_TEMPORAIRE: 'Aucune action pour le moment',
  ENRICH: 'Vérifier / enrichir',
}

const POTENTIEL_COLOR: Record<string, string> = { FORT: DS.violet, MOYEN: DS.muted, FAIBLE: DS.subtle }
const TEMPERATURE_LABEL: Record<string, string> = { FROID: 'Froid', TIEDE: 'Tiède', CHAUD: 'Chaud' }

export function ProspectCard({ vm }: { vm: ProspectViewModel }) {
  const { engine, business, interlocuteur, companyName, ville } = vm
  const isChaud = engine.temperature === 'CHAUD'

  return (
    <div
      style={{
        background: DS.white,
        border: `1px solid ${DS.border}`,
        borderRadius: DS.rLg,
        padding: '20px 22px',
        marginBottom: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontFamily: DS.fontDisplay, fontWeight: 700, fontSize: 17, color: DS.text }}>
            <Link href={`/admin/prospects/${vm.companyId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              {companyName}
            </Link>
          </div>
          <div style={{ fontFamily: DS.fontBody, fontSize: 13, color: DS.muted, marginTop: 2 }}>
            {ville ?? 'Ville non renseignée'}
            {vm.distanceKm != null && ` · ${vm.distanceKm.toFixed(0)} km`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <Badge label={vm.engine.potentiel} color={POTENTIEL_COLOR[vm.engine.potentiel]} />
          <Badge
            label={TEMPERATURE_LABEL[vm.engine.temperature]}
            color={isChaud ? DS.fuchsia : DS.subtle}
            filled={isChaud}
          />
        </div>
      </div>

      <div
        style={{
          fontFamily: DS.fontBody,
          fontSize: 13.5,
          color: DS.text,
          background: DS.off,
          borderRadius: DS.rMd,
          padding: '10px 12px',
          lineHeight: 1.45,
        }}
      >
        <span style={{ color: DS.violet, fontWeight: 700 }}>{business.raisonLabel} — </span>
        {business.raisonMaintenant}
      </div>

      {interlocuteur ? (
        <div style={{ fontFamily: DS.fontBody, fontSize: 13.5, color: DS.text, display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700 }}>
            {interlocuteur.prenom} {interlocuteur.nom}
          </span>
          <span style={{ color: DS.muted }}>
            {interlocuteur.type === 'telephone' ? interlocuteur.value : interlocuteur.value}
          </span>
        </div>
      ) : (
        <div style={{ fontFamily: DS.fontBody, fontSize: 13, color: DS.muted, fontStyle: 'italic' }}>
          Interlocuteur à confirmer avant contact.
        </div>
      )}

      <Link
        href={`/admin/prospects/${vm.companyId}`}
        style={{
          alignSelf: 'flex-start',
          marginTop: 4,
          padding: '10px 20px',
          borderRadius: DS.rMd,
          border: 'none',
          background: interlocuteur ? DS.grad : DS.lav,
          color: interlocuteur ? DS.white : DS.violet,
          fontFamily: DS.fontBody,
          fontWeight: 700,
          fontSize: 13.5,
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        Voir la fiche →
      </Link>
    </div>
  )
}

function Badge({ label, color, filled }: { label: string; color: string; filled?: boolean }) {
  return (
    <span
      style={{
        fontFamily: DS.fontBody,
        fontSize: 11.5,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 999,
        color: filled ? DS.white : color,
        background: filled ? color : 'transparent',
        border: filled ? 'none' : `1.5px solid ${color}`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
