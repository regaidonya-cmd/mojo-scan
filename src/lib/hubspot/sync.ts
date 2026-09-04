// ══════════════════════════════════════════════════════════════
// MOJO SCAN — Sync HubSpot
// Encapsulé derrière un adaptateur — mock si non configuré
// ══════════════════════════════════════════════════════════════

import type { BusinessScore, LeadScore, Priority, Recommendation, FundingResult, Company } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

interface SyncPayload {
  supabase:       SupabaseClient
  diagnosticId:   string
  contact?:       { firstname: string; email: string; phone?: string }
  company?:       Partial<Company>
  businessScore:  BusinessScore
  leadScore:      LeadScore
  priorities:     Priority[]
  recommendations:Recommendation[]
  funding:        FundingResult[]
  reportUrl:      string
  answersMap:     Record<string, string>
}

export async function syncToHubspot(payload: SyncPayload): Promise<void> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN
  if (!token) {
    // Pas configuré — ajouter à la sync_queue pour retry ultérieur
    await payload.supabase.from('sync_queue').insert({
      provider:    'hubspot',
      object_type: 'diagnostic',
      payload:     JSON.stringify({
        diagnosticId:  payload.diagnosticId,
        contact:       payload.contact,
        company:       payload.company,
        businessScore: payload.businessScore,
        leadScore:     payload.leadScore,
        reportUrl:     payload.reportUrl,
      }),
      status: 'pending',
    })
    return
  }

  try {
    const baseUrl = 'https://api.hubapi.com'
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    // 1. Créer/mettre à jour le contact
    if (!payload.contact?.email) return

    const contactRes = await fetch(`${baseUrl}/crm/v3/objects/contacts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        properties: {
          firstname:  payload.contact.firstname,
          email:      payload.contact.email,
          phone:      payload.contact.phone ?? '',
          company:    payload.company?.name ?? '',
          jobtitle:   payload.answersMap['P1'] ?? '',
          // Custom properties MOJO Scan
          mojo_business_score:  String(payload.businessScore.global),
          mojo_lead_score:      String(payload.leadScore.total),
          mojo_lead_level:      payload.leadScore.level,
          mojo_objective:       payload.answersMap['P3'] ?? '',
          mojo_report_url:      payload.reportUrl,
          mojo_priority_1:      payload.priorities[0]?.label ?? '',
          mojo_recommendation:  payload.recommendations[0]?.item.title ?? '',
        }
      })
    })

    const contact = await contactRes.json()
    const hubspotContactId = contactRes.ok ? contact.id : null

    // 2. Créer un deal si lead chaud ou prioritaire
    if (hubspotContactId && ['hot','priority'].includes(payload.leadScore.level)) {
      await fetch(`${baseUrl}/crm/v3/objects/deals`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          properties: {
            dealname:   `MOJO Scan — ${payload.contact.firstname} — ${payload.company?.name ?? 'Prospect'}`,
            dealstage:  'appointmentscheduled',
            pipeline:   'default',
            amount:     String(payload.recommendations[0]?.item.price_ht ?? 990),
          },
          associations: [
            {
              to: { id: hubspotContactId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
            }
          ]
        })
      })
    }

    // Marquer comme synced
    await payload.supabase.from('diagnostics')
      .update({
        hubspot_contact_id: hubspotContactId,
        hubspot_synced_at: new Date().toISOString(),
      })
      .eq('id', payload.diagnosticId)

  } catch (err) {
    console.error('HubSpot sync error:', err)
    // Ajouter à la queue pour retry
    await payload.supabase.from('sync_queue').insert({
      provider:    'hubspot',
      object_type: 'diagnostic',
      payload:     JSON.stringify({ diagnosticId: payload.diagnosticId }),
      status:      'failed',
      last_error:  String(err),
    })
  }
}
