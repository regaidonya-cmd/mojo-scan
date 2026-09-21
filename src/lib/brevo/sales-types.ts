export interface MojoContactAttributes {
  MOJO_COMPANY_ID: string
  MOJO_CAMPAIGN_CODE: string
  MOJO_LOT_CODE: string
  SEGMENT_METIER?: string
  RAISON_SOCIALE?: string
  COMMUNE?: string
  DEPARTEMENT?: string
  SIREN?: string
}

export interface BrevoContactSnapshot {
  found: boolean
  id?: string
  attributes: Record<string, unknown>
  listIds: number[]
}

/** Abstraction du client Brevo — permet l'injection d'un mock en test,
 * jamais d'appel réseau réel hors de l'implémentation `realBrevoClient()`. */
export interface BrevoApiClient {
  getContact(email: string): Promise<BrevoContactSnapshot>
  upsertContact(email: string, attributes: Record<string, unknown>, listIds: number[]): Promise<{ id: string }>
  getOrCreateList(name: string): Promise<{ id: number; created: boolean }>
}

export interface MembreASynchroniser {
  companyId: string
  email: string
  emailExploitable: boolean
  oppositionActive: boolean
  eligibiliteCampagneToujoursValide: boolean
  attributes: MojoContactAttributes
}

export type StatutSyncMembre = 'SYNCHRONISE' | 'EXCLU' | 'ERREUR'

export interface ResultatSyncMembre {
  companyId: string
  statut: StatutSyncMembre
  raison: string | null
  brevoContactId?: string
}

export interface ResultatSyncLot {
  selectionnes: number
  synchronises: number
  exclus: number
  erreurs: number
  brevoListId: number | null
  details: ResultatSyncMembre[]
}
