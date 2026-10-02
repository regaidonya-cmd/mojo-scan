import Link from 'next/link'
import { DS } from '@/lib/ds/tokens'
import type { ProspectViewModel, HistoriqueEvent } from '@/lib/priority/fetch-real'
import { ResultatAppelForm } from './ResultatAppelForm'
import { formatDateHeureFr, formatDateFr } from '@/lib/priority/format-date-fr'
import { getStatutBadgeLabel, getRaisonAffichee, peutEnregistrerResultat } from '@/lib/priority/fiche-presentation'
import { LIBELLES_STATUT_EMAIL } from '@/lib/insight/insight-v1'
import { LIBELLES_NIVEAU, LIBELLES_SOURCE, TEXTE_CONTEXTE_SEULEMENT, TEXTE_AUCUN_INSIGHT } from '@/lib/insight/referentiels'

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

export function FicheProspectView({
  vm, historique, retourHref = '/admin/prospects', endpointActivite, modeSdr = false,
}: {
  vm: ProspectViewModel
  historique: HistoriqueEvent[]
  // PR3 — réutilisation SDR sans dupliquer la fiche (défauts = ADMIN inchangé)
  retourHref?: string
  endpointActivite?: string
  modeSdr?: boolean
}) {
  const { engine, business, companyName, siren, naf, ville, distanceKm, interlocuteur, pipelineStage, telephoneAffichable, emailAffichable } = vm
  const contactEntrepriseSeul = !interlocuteur && engine.selectedContact?.nominatif === false
  // INSIGHT V1 — fiche SDR uniquement (ADMIN inchangé). « Pourquoi maintenant ? »
  // du moteur (signal réel P0/P1) et les statuts STOP/TERMINE gardent la priorité.
  const insight = modeSdr ? vm.insight ?? null : null
  const insightPourquoi = !!insight && !['STOP', 'TERMINE', 'P0', 'P1'].includes(engine.priorite)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px 60px', fontFamily: DS.fontBody }}>
      <Link href={retourHref} style={{ fontSize: 13, color: DS.violet, textDecoration: 'none', fontWeight: 700 }}>
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

      {/* PR3 — Contexte d'appel SDR : uniquement des données déjà connues, rien d'inventé */}
      {modeSdr && (
        <Section title="Contexte">
          <Row label="Activité (NAF)" value={naf ?? '—'} />
          {insight && <Row label="Famille métier" value={insight.familleLibelle} />}
          <Row label="Commune" value={ville ?? '—'} />
          <Row label="Téléphone" value={telephoneAffichable ?? '—'} />
          <Row label="Site" value={vm.siteWeb ?? '—'} />
          <Row label="Email" value={emailAffichable ?? vm.emailEnrichissement ?? '—'} />
          {!emailAffichable && vm.emailEnrichissement && (
            <p style={{ fontSize: 12, color: DS.muted, margin: '0 0 6px' }}>Email issu de l'enrichissement, non qualifié.</p>
          )}
          <Row label="Température" value={vm.persistedTemperature ?? '—'} />
          <Row label="Besoin identifié" value={vm.besoinIdentifie ?? '—'} />
          {vm.qualiteContact && (
            <Row
              label="Qualité contact"
              value={vm.qualiteContact === 'A_COMPLET'
                ? 'A_COMPLET (téléphone + email)'
                : `B_APPELABLE (téléphone)${vm.statutEmailV2 && LIBELLES_STATUT_EMAIL[vm.statutEmailV2] ? ` — ${LIBELLES_STATUT_EMAIL[vm.statutEmailV2]}` : ''}`}
            />
          )}
        </Section>
      )}

      {/* Contactabilité / Connaissance / Armement — masqué en SDR (INSIGHT V1 le remplace) */}
      {!insight && (
        <Section title="Diagnostic commercial">
          <Row label="Contactabilité" value={business.contactabilite} />
          <Row label="Connaissance" value={business.connaissance} />
          <Row label="Armement" value={business.armement} />
        </Section>
      )}

      {/* Pourquoi maintenant / ce prospect — wording conditionné à la priorité réelle.
          P0.7E : pour STOP/TERMINE, texte de présentation dédié — ne modifie
          jamais business.raisonMaintenant (règle métier inchangée), seul
          l'affichage est adapté ici. */}
      <Section title={insightPourquoi ? 'Pourquoi ce prospect ?' : engine.priorite === 'STOP' || engine.priorite === 'TERMINE' ? 'Statut' : business.raisonLabel}>
        <p style={{ fontSize: 14, color: DS.text, lineHeight: 1.5, margin: 0 }}>
          {insightPourquoi ? insight!.pourquoi : getRaisonAffichee(engine.priorite, business.raisonMaintenant)}
        </p>
      </Section>

      {/* FAIT OBSERVÉ — ce que nous savons réellement, sourcé */}
      <Section title="Fait observé">
        {insight ? (
          <>
            <div style={{ marginBottom: 10 }}>
              <Chip label={LIBELLES_NIVEAU[insight.niveau]} filled={insight.niveau === 'INSIGHT_EXPLOITABLE'} muted={insight.niveau === 'AUCUN_INSIGHT_FIABLE'} />
            </div>
            {insight.niveau === 'AUCUN_INSIGHT_FIABLE' && (
              <div style={{ background: DS.off, border: `1px solid ${DS.border2}`, borderRadius: DS.rMd, padding: 10, marginBottom: 10, fontSize: 13, color: DS.text }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{TEXTE_AUCUN_INSIGHT}</div>
                {insight.alertes.map((a, i) => <div key={i} style={{ color: DS.muted }}>⚠ {a}</div>)}
              </div>
            )}
            {insight.faits.map((f, i) => (
              <p key={i} style={{ fontSize: 13.5, color: DS.text, margin: '0 0 6px', lineHeight: 1.5 }}>
                {f.texte} <span style={{ color: DS.muted, fontSize: 12 }}>— Source : {LIBELLES_SOURCE[f.source]}</span>
              </p>
            ))}
            {insight.niveau === 'CONTEXTE_SEULEMENT' && (
              <p style={{ fontSize: 13, color: DS.muted, fontStyle: 'italic', margin: '6px 0 0' }}>{TEXTE_CONTEXTE_SEULEMENT}</p>
            )}
            {insight.niveau !== 'AUCUN_INSIGHT_FIABLE' && insight.alertes.map((a, i) => (
              <p key={i} style={{ fontSize: 12.5, color: DS.muted, margin: '6px 0 0' }}>⚠ {a}</p>
            ))}
          </>
        ) : business.faitPrincipal && business.faitPrincipal.sensibilite === 'UTILISABLE_DANS_ACCROCHE' ? (
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
        {insight ? (
          <>
            <p style={{ fontSize: 14, color: DS.text, lineHeight: 1.5, margin: 0, fontWeight: 600 }}>{insight.angle}</p>
            <p style={{ fontSize: 12, color: DS.muted, margin: '6px 0 0' }}>{insight.mention}</p>
          </>
        ) : (
          <p style={{ fontSize: 13.5, color: DS.text, lineHeight: 1.5, margin: 0, fontStyle: business.armement === 'PRET' ? 'normal' : 'italic' }}>
            {business.angleApproche}
          </p>
        )}
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
            {contactEntrepriseSeul
              ? "Standard de l'entreprise — aucun interlocuteur nominatif identifié à ce jour."
              : business.contactabilite === 'PARTIELLE'
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
            endpoint={endpointActivite}
            modeSdr={modeSdr}
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
