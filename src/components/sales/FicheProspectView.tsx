import Link from 'next/link'
import { DS } from '@/lib/ds/tokens'
import type { ProspectViewModel, HistoriqueEvent } from '@/lib/priority/fetch-real'
import { ResultatAppelForm } from './ResultatAppelForm'
import { formatDateHeureFr, formatDateFr } from '@/lib/priority/format-date-fr'
import { getStatutBadgeLabel, getRaisonAffichee, peutEnregistrerResultat } from '@/lib/priority/fiche-presentation'

const PIPELINE_LABEL: Record<string, string> = {
  A_CONTACTER: 'À contacter', EN_DISCUSSION: 'En discussion', RDV: 'RDV',
  PROPOSITION: 'Proposition', GAGNE: 'Gagné', PERDU: 'Perdu',
}
const NBA_LABEL: Record<string, string> = {
  CALL: 'Appeler', EMAIL: 'Envoyer un email', QUALIFY: 'Qualifier', ENRICH: 'Vérifier / enrichir',
  FOLLOW_UP: 'Relancer', PREPARE_RDV: 'Préparer le RDV', PREPARE_MEETING: 'Préparer le RDV',
  SEND_PROPOSAL: 'Envoyer une proposition', CALLBACK: 'Rappeler',
  WAIT: 'Attendre', NURTURE: 'Relancer ultérieurement', NO_ACTION: 'Aucune action', NO_ACTION_TEMPORAIRE: 'Aucune action pour le moment',
  STOP: 'Aucune action possible',
}

export function FicheProspectView({ vm, historique }: { vm: ProspectViewModel; historique: HistoriqueEvent[] }) {
  const { engine, business, companyName, siren, naf, ville, distanceKm, interlocuteur, pipelineStage, telephoneAffichable, emailAffichable } = vm

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px 60px', fontFamily: DS.fontBody }}>
      <Link href="/admin/prospects" style={{ fontSize: 13, color: DS.violet, textDecoration: 'none', fontWeight: 700 }}>
        ← Retour aux prospects
      </Link>

      <div style={{ marginTop: 12, marginBottom: 24 }}>
        <div style={{ fontFamily: DS.fontDisplay, fontWeight: 800, fontSize: 24, color: DS.night }}>{companyName}</div>
        <div style={{ color: DS.muted, fontSize: 13.5, marginTop: 4 }}>
          SIREN {siren} {naf && `· NAF ${naf}`} {ville && `· ${ville}`} {distanceKm != null && `· ${distanceKm.toFixed(0)} km`}
        </div>
      </div>

      {/* Bandeau statut */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' as const }}>
        <Chip label={`Potentiel : ${engine.potentiel}`} />
        <Chip label={`Température : ${engine.temperature}`} />
        <Chip label={`Priorité : ${engine.priorite}`} />
        <Chip label={`Pipeline : ${PIPELINE_LABEL[pipelineStage] ?? pipelineStage}`} />
        {(() => {
          const badge = getStatutBadgeLabel(engine.priorite, business.ready)
          return <Chip label={badge.label} filled={badge.filled} muted={badge.muted} />
        })()}
      </div>

      {/* Contactabilité / Connaissance / Armement */}
      <Section title="Diagnostic commercial">
        <Row label="Contactabilité" value={business.contactabilite} />
        <Row label="Connaissance" value={business.connaissance} />
        <Row label="Armement" value={business.armement} />
      </Section>

      {/* Pourquoi maintenant / ce prospect — wording conditionné à la priorité réelle.
          P0.7E : pour STOP/TERMINE, texte de présentation dédié — ne modifie
          jamais business.raisonMaintenant (règle métier inchangée), seul
          l'affichage est adapté ici. */}
      <Section title={engine.priorite === 'STOP' || engine.priorite === 'TERMINE' ? 'Statut' : business.raisonLabel}>
        <p style={{ fontSize: 14, color: DS.text, lineHeight: 1.5, margin: 0 }}>
          {getRaisonAffichee(engine.priorite, business.raisonMaintenant)}
        </p>
      </Section>

      {/* FAIT OBSERVÉ — ce que nous savons réellement, sourcé */}
      <Section title="Fait observé">
        {business.faitPrincipal && business.faitPrincipal.sensibilite === 'UTILISABLE_DANS_ACCROCHE' ? (
          <>
            <p style={{ fontSize: 14, color: DS.text, margin: '0 0 8px', lineHeight: 1.5 }}>
              {business.faitPrincipal.texteAffichable || '(sans texte spécifique)'}
            </p>
            <Row label="Source" value={business.faitPrincipal.source} />
          </>
        ) : (
          <p style={{ fontSize: 13.5, color: DS.muted, fontStyle: 'italic', margin: 0 }}>
            Aucun fait commercial différenciant identifié à ce jour.
          </p>
        )}
      </Section>

      {/* ANGLE D'APPROCHE SUGGÉRÉ — toujours présenté comme suggestion, jamais un fait */}
      <Section title="Angle d'approche suggéré">
        <p style={{ fontSize: 13.5, color: DS.text, lineHeight: 1.5, margin: 0, fontStyle: business.armement === 'PRET' ? 'normal' : 'italic' }}>
          {business.angleApproche}
        </p>
      </Section>

      {/* Interlocuteur / contact */}
      <Section title="Contact">
        {interlocuteur ? (
          <>
            <Row label="Interlocuteur" value={`${interlocuteur.prenom} ${interlocuteur.nom}`.trim() || '(nom non renseigné)'} />
            <Row label="Canal recommandé" value={interlocuteur.type === 'telephone' ? 'Téléphone' : 'Email'} />
          </>
        ) : (
          <p style={{ fontSize: 13.5, color: DS.muted, fontStyle: 'italic', margin: '0 0 8px' }}>
            {business.contactabilite === 'PARTIELLE'
              ? 'Plusieurs interlocuteurs possibles — aucun critère objectif ne permet de choisir pour le moment.'
              : business.contactabilite === 'BLOQUEE'
                ? 'Aucun contact autorisé (opposition).'
                : 'Aucun contact exploitable identifié à ce jour.'}
          </p>
        )}
        {telephoneAffichable && <Row label="Téléphone autorisé" value={telephoneAffichable} />}
        {emailAffichable && <Row label="Email autorisé" value={emailAffichable} />}
      </Section>

      {/* NBA — lien tel: reel uniquement si telephone autorise ET action = CALL ;
          sinon information seule (P0.7D-FIX.5 : displayNba = source unique,
          priorite a une action commerciale persistee pertinente) */}
      <Section title="Prochaine action recommandée">
        {business.displayNba.type === 'CALL' && telephoneAffichable ? (
          <a
            href={`tel:${telephoneAffichable.replace(/\s/g, '')}`}
            style={{
              display: 'inline-block', padding: '10px 20px', borderRadius: DS.rMd,
              background: DS.grad, color: DS.white, fontWeight: 700, fontSize: 14, textDecoration: 'none',
            }}
          >
            Appeler {telephoneAffichable} →
          </a>
        ) : (
          <div style={{ display: 'inline-block', padding: '10px 20px', borderRadius: DS.rMd, background: DS.lav, color: DS.violet, fontWeight: 700, fontSize: 14 }}>
            {NBA_LABEL[business.displayNba.type] ?? business.displayNba.type}
            {business.displayNba.dueAt && (
              <span style={{ fontWeight: 500 }}> — {formatDateHeureFr(business.displayNba.dueAt)}</span>
            )}
          </div>
        )}
        {business.displayNba.source === 'PERSISTE' && (
          <p style={{ fontSize: 12, color: DS.muted, marginTop: 6 }}>{business.displayNba.reason}</p>
        )}
        <p style={{ fontSize: 12.5, color: DS.muted, marginTop: 10 }}>
          {business.displayNba.type === 'CALL' && telephoneAffichable
            ? "Le lien ouvre votre application téléphone — aucun appel n'est déclenché automatiquement, aucune donnée n'est écrite."
            : "Aucune action n'est déclenchée automatiquement depuis cette page."}
        </p>
        {!peutEnregistrerResultat(engine.priorite) ? (
          <p style={{ fontSize: 13, color: DS.muted, fontStyle: 'italic', marginTop: 10 }}>
            Prospection arrêtée — aucune action commerciale autorisée.
          </p>
        ) : (
          <ResultatAppelForm
            companyId={vm.companyId}
            personneId={engine.selectedContact?.personneId ?? null}
            moyenContactId={engine.selectedContact?.contactMethodId ?? null}
          />
        )}
      </Section>

      {/* P0.7 — Historique commercial réel. Vide tant qu'aucune écriture
          n'a eu lieu (activites=0 ligne) — jamais un historique inventé. */}
      <Section title="Historique commercial">
        {historique.length === 0 ? (
          <p style={{ fontSize: 13, color: DS.muted, fontStyle: 'italic', margin: 0 }}>
            Aucun événement enregistré pour le moment.
          </p>
        ) : (
          historique.map((h) => (
            <div key={h.id} style={{ padding: '8px 0', borderBottom: `1px solid ${DS.border}`, fontSize: 13 }}>
              <span style={{ color: DS.muted }}>{formatDateFr(h.dateEvenement)}</span>
              {' — '}
              <span style={{ fontWeight: 700 }}>{h.type ?? 'Événement'}</span>
              {h.resultat && ` — ${h.resultat}`}
              {h.description && <div style={{ color: DS.muted, marginTop: 2 }}>{h.description}</div>}
            </div>
          ))
        )}
      </Section>

      {engine.warnings.length > 0 && (
        <Section title="Avertissements">
          {engine.warnings.map((w, i) => (
            <p key={i} style={{ fontSize: 13, color: DS.muted, margin: '0 0 4px' }}>
              ⚠ {w}
            </p>
          ))}
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22, paddingBottom: 20, borderBottom: `1px solid ${DS.border}` }}>
      <h2 style={{ fontFamily: DS.fontDisplay, fontWeight: 700, fontSize: 14, color: DS.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, margin: '0 0 10px' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, fontSize: 13.5, marginBottom: 6 }}>
      <span style={{ color: DS.muted, minWidth: 130 }}>{label}</span>
      <span style={{ color: DS.text, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function Chip({ label, filled, muted }: { label: string; filled?: boolean; muted?: boolean }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        padding: '5px 12px',
        borderRadius: 999,
        background: filled ? DS.grad : DS.off,
        color: filled ? DS.white : muted ? DS.subtle : DS.text,
        border: filled ? 'none' : `1px solid ${DS.border2}`,
      }}
    >
      {label}
    </span>
  )
}
