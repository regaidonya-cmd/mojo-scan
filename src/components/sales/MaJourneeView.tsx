'use client'

import { useState } from 'react'
import { DS } from '@/lib/ds/tokens'
import type { MaJourneeClassification } from '@/lib/priority/ma-journee-sort'
import { ProspectCard } from './ProspectCard'

const PAGE_SIZE = 10

export function MaJourneeView({ data }: { data: MaJourneeClassification }) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [showPreparer, setShowPreparer] = useState(false)

  const { zoneA, zoneRelance, zoneBReady, aPreparer } = data
  const visibleZoneB = zoneBReady.slice(0, visible)
  const hasMore = zoneBReady.length > visible

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 80px', fontFamily: DS.fontBody }}>
      <header style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: DS.fontDisplay, fontWeight: 800, fontSize: 26, color: DS.night }}>Ma journée</div>
        <p style={{ color: DS.muted, fontSize: 14.5, marginTop: 6 }}>
          Bonjour Donya, voici ce qui mérite votre attention aujourd'hui.
        </p>
      </header>

      {/* ZONE A — À traiter maintenant */}
      <Section title="À traiter maintenant">
        {zoneA.length === 0 ? (
          <EmptyState
            title="Rien d'urgent pour le moment."
            subtitle={
              zoneBReady.length > 0
                ? `Vous avez ${zoneBReady.length} prospect${zoneBReady.length > 1 ? 's' : ''} prêt${zoneBReady.length > 1 ? 's' : ''} à être contacté${zoneBReady.length > 1 ? 's' : ''}.`
                : undefined
            }
          />
        ) : (
          zoneA.map((vm) => <ProspectCard key={vm.companyId} vm={vm} />)
        )}
      </Section>

      {/* P0.7 — RELANCE : action due mais de nature non urgente (NURTURE/WAIT).
          Jamais mélangée à "À traiter maintenant" — c'est la NATURE de
          l'action, pas la seule date, qui détermine l'urgence réelle. */}
      {zoneRelance.length > 0 && (
        <Section title={`Relances arrivées à échéance — ${zoneRelance.length}`} muted>
          {zoneRelance.map((vm) => (
            <ProspectCard key={vm.companyId} vm={vm} />
          ))}
        </Section>
      )}

      {/* ZONE B — J'ai du temps */}
      <Section
        title="J'ai du temps"
        subtitle={
          zoneBReady.length > 0
            ? `${zoneBReady.length} prospect${zoneBReady.length > 1 ? 's sont' : ' est'} prêt${zoneBReady.length > 1 ? 's' : ''} à être contacté${zoneBReady.length > 1 ? 's' : ''}.`
            : undefined
        }
      >
        {zoneBReady.length === 0 ? (
          <EmptyState title="Aucun prospect READY pour le moment." subtitle="Consultez « À préparer » ci-dessous." />
        ) : (
          <>
            {visibleZoneB.map((vm) => (
              <ProspectCard key={vm.companyId} vm={vm} />
            ))}
            {hasMore && (
              <button onClick={() => setVisible((v) => v + PAGE_SIZE)} style={secondaryButtonStyle}>
                Voir plus de prospects ({zoneBReady.length - visible} restants)
              </button>
            )}
          </>
        )}
      </Section>

      {/* À PRÉPARER — secondaire, jamais mélangé à la liste principale */}
      {aPreparer.length > 0 && (
        <Section title={`À préparer — ${aPreparer.length}`} muted>
          <p style={{ fontSize: 13.5, color: DS.muted, margin: '0 0 12px' }}>
            {summarizeAPreparer(aPreparer)}
          </p>
          {!showPreparer ? (
            <button onClick={() => setShowPreparer(true)} style={secondaryButtonStyle}>
              Voir →
            </button>
          ) : (
            aPreparer.map((vm) => <PreparerRow key={vm.companyId} vm={vm} />)
          )}
        </Section>
      )}
    </div>
  )
}

function summarizeAPreparer(items: MaJourneeClassification['aPreparer']): string {
  const qualify = items.filter((v) => v.business.displayNba.type === 'QUALIFY').length
  const enrich = items.filter((v) => v.business.displayNba.type === 'ENRICH').length
  const other = items.length - qualify - enrich
  const parts: string[] = []
  if (enrich > 0) parts.push(`${enrich} à enrichir`)
  if (qualify > 0) parts.push(`${qualify} à qualifier`)
  if (other > 0) parts.push(`${other} en attente`)
  return parts.join(' · ')
}

function Section({
  title,
  subtitle,
  muted,
  children,
}: {
  title: string
  subtitle?: string
  muted?: boolean
  children: React.ReactNode
}) {
  return (
    <section style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <h2
          style={{
            fontFamily: DS.fontDisplay,
            fontWeight: 700,
            fontSize: muted ? 14 : 17,
            color: muted ? DS.muted : DS.night,
            textTransform: muted ? ('uppercase' as const) : undefined,
            letterSpacing: muted ? 0.5 : undefined,
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
      {subtitle && <p style={{ fontSize: 13.5, color: DS.muted, margin: '0 0 14px' }}>{subtitle}</p>}
      {!subtitle && <div style={{ height: 12 }} />}
      {children}
    </section>
  )
}

function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div
      style={{
        background: DS.off,
        border: `1px dashed ${DS.border2}`,
        borderRadius: DS.rLg,
        padding: '24px 20px',
        textAlign: 'center' as const,
      }}
    >
      <div style={{ fontSize: 14.5, color: DS.text, fontWeight: 600 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: DS.muted, marginTop: 6 }}>{subtitle}</div>}
    </div>
  )
}

function PreparerRow({ vm }: { vm: MaJourneeClassification['aPreparer'][number] }) {
  const label: Record<string, string> = {
    QUALIFY: 'À qualifier',
    ENRICH: 'À vérifier / enrichir',
    NO_ACTION_TEMPORAIRE: 'Aucun canal disponible',
    CALLBACK: 'Rappeler',
    FOLLOW_UP: 'Relancer',
    PREPARE_MEETING: 'Préparer RDV',
    NURTURE: 'Relancer ultérieurement',
  }
  const nba = vm.business.displayNba
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
        borderBottom: `1px solid ${DS.border}`,
        fontSize: 13.5,
      }}
    >
      <span style={{ color: DS.text, fontWeight: 600 }}>{vm.companyName}</span>
      <span style={{ color: DS.muted }}>
        {label[nba.type] ?? nba.type}
        {nba.dueAt && ` — ${new Date(nba.dueAt).toLocaleDateString('fr-FR')}`}
      </span>
    </div>
  )
}

const secondaryButtonStyle: React.CSSProperties = {
  marginTop: 8,
  padding: '10px 18px',
  borderRadius: DS.rMd,
  border: `1.5px solid ${DS.border2}`,
  background: DS.white,
  color: DS.violet,
  fontFamily: DS.fontBody,
  fontWeight: 700,
  fontSize: 13.5,
  cursor: 'pointer',
}
