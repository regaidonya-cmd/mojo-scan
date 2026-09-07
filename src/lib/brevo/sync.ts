// ══════════════════════════════════════════════════════════════
// MOJO Lead Engine — Brevo sync (serveur uniquement)
// Clé API UNIQUEMENT côté serveur via variable d'environnement
// ══════════════════════════════════════════════════════════════
//
// ATTRIBUTS À CRÉER DANS BREVO AVANT UTILISATION :
// (Brevo > Contacts > Settings > Contact attributes > Create attribute)
//
// Nom          | Type  | Description
// -------------|-------|-----------------------------
// PRENOM       | Text  | Prénom
// NOM          | Text  | Nom de famille
// TELEPHONE    | Text  | Téléphone
// ENTREPRISE   | Text  | Nom de l'entreprise
// SIRET        | Text  | SIRET (14 chiffres)
// APE          | Text  | Code APE
// APE_LIBELLE  | Text  | Libellé APE
// SEGMENT_METIER | Text | Métier/parcours détecté
// PARCOURS     | Text  | ID parcours MOJO (PARC-001..006)
// FORMATION_1  | Text  | Formation recommandée #1
// FORMATION_2  | Text  | Formation recommandée #2
// FORMATION_3  | Text  | Formation recommandée #3
// SOURCE       | Text  | Source du lead (mojo-scan)
// DATE_DIAGNOSTIC | Date | Date du diagnostic
// STATUT_PROSPECT | Text | Statut commercial
// ══════════════════════════════════════════════════════════════

export interface BrevoContactData {
  email: string
  firstname: string
  lastname?: string
  phone?: string
  company?: string
  siret?: string
  ape?: string
  ape_label?: string
  segment_metier?: string
  parcours?: string
  formation_1?: string
  formation_2?: string
  formation_3?: string
  source?: string
  diagnostic_date?: string
  statut?: string
}

export async function syncContactBrevo(data: BrevoContactData): Promise<{
  success: boolean
  error?: string
  contact_id?: string
}> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.warn('[Brevo] BREVO_API_KEY manquante — sync ignorée')
    return { success: false, error: 'BREVO_API_KEY manquante' }
  }

  try {
    const payload = {
      email: data.email,
      updateEnabled: true,  // upsert natif Brevo — évite les doublons
      attributes: {
        PRENOM:          data.firstname,
        NOM:             data.lastname ?? '',
        TELEPHONE:       data.phone ?? '',
        ENTREPRISE:      data.company ?? '',
        SIRET:           data.siret ?? '',
        APE:             data.ape ?? '',
        APE_LIBELLE:     data.ape_label ?? '',
        SEGMENT_METIER:  data.segment_metier ?? '',
        PARCOURS:        data.parcours ?? '',
        FORMATION_1:     data.formation_1 ?? '',
        FORMATION_2:     data.formation_2 ?? '',
        FORMATION_3:     data.formation_3 ?? '',
        SOURCE:          data.source ?? 'mojo-scan',
        DATE_DIAGNOSTIC: data.diagnostic_date ?? new Date().toISOString().split('T')[0],
        STATUT_PROSPECT: data.statut ?? 'DIAGNOSTIC_COMPLETED',
      },
    }

    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if ([200, 201, 204].includes(res.status)) {
      const json = res.status !== 204 ? await res.json().catch(() => ({})) : {}
      console.log(`[Brevo] ✓ Contact sync: ${data.email}`)
      return { success: true, contact_id: json.id?.toString() }
    }

    const errBody = await res.json().catch(() => ({}))
    const errMsg = `Brevo ${res.status}: ${errBody.message ?? 'error'}`
    console.error(`[Brevo] ✗ ${errMsg}`)
    return { success: false, error: errMsg }

  } catch (e: any) {
    console.error('[Brevo] Exception réseau:', e.message)
    return { success: false, error: e.message ?? 'Brevo unavailable' }
  }
}
