// ══════════════════════════════════════════════════════════════
// MOJO SCAN — Envoi email diagnostic
// Provider : Resend (configurable)
// ══════════════════════════════════════════════════════════════

import type { BusinessScore, LeadScore, Priority, Recommendation, FundingResult } from '@/types'

interface EmailPayload {
  to:              string
  firstname:       string
  businessScore:   BusinessScore
  leadScore:       LeadScore
  priorities:      Priority[]
  recommendations: Recommendation[]
  funding:         FundingResult[]
  reportUrl:       string
}

export async function sendDiagnosticEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY non configuré — email non envoyé')
    return
  }

  const { to, firstname, businessScore, priorities, recommendations, funding, reportUrl } = payload
  const topReco  = recommendations[0]
  const topFund  = funding[0]

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Votre diagnostic MOJO Scan</title></head>
<body style="margin:0;padding:0;background:#F8F7F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">

  <!-- Header -->
  <div style="background:#0A0F1E;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
    <p style="color:#E85D26;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 8px;">MOJO ACADÉMIE</p>
    <h1 style="color:#fff;font-size:24px;font-weight:600;margin:0 0 8px;">Bonjour ${firstname},</h1>
    <p style="color:#9CA3AF;font-size:14px;margin:0;">Voici votre diagnostic digital complet</p>
    <div style="margin-top:20px;">
      <span style="font-size:52px;font-weight:700;color:${businessScore.global >= 70 ? '#10B981' : businessScore.global >= 40 ? '#F59E0B' : '#EF4444'};">
        ${businessScore.global}
      </span>
      <span style="font-size:20px;color:#6B7280;">/100</span>
    </div>
    <p style="color:#9CA3AF;font-size:12px;margin-top:4px;">Score digital global</p>
  </div>

  <!-- Priorités -->
  <div style="background:#fff;border-radius:16px;border:1px solid #E5E7EB;padding:24px;margin-bottom:16px;">
    <h2 style="font-size:14px;font-weight:600;color:#111827;margin:0 0 16px;">Vos 3 priorités identifiées</h2>
    ${priorities.map((p, i) => `
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
      <div style="width:28px;height:28px;border-radius:50%;background:#FEF3EE;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="font-size:12px;font-weight:700;color:#E85D26;">${p.rank}</span>
      </div>
      <div>
        <p style="font-weight:600;font-size:13px;color:#111827;margin:0 0 2px;">${p.label}</p>
        <p style="font-size:12px;color:#6B7280;margin:0;">${p.detail}</p>
      </div>
    </div>`).join('')}
  </div>

  ${topReco ? `
  <!-- Recommandation -->
  <div style="background:#fff;border-radius:16px;border:2px solid #E85D26;padding:24px;margin-bottom:16px;">
    <p style="font-size:11px;font-weight:600;color:#E85D26;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Formation recommandée</p>
    <h3 style="font-size:15px;font-weight:600;color:#111827;margin:0 0 6px;">${topReco.item.title}</h3>
    <p style="font-size:12px;color:#6B7280;margin:0 0 12px;">${topReco.reason}</p>
    <div style="display:flex;gap:16px;font-size:12px;color:#6B7280;">
      <span>⏱ ${topReco.item.duration_h}h</span>
      <span style="font-weight:600;color:#111827;">${topReco.item.price_ht} € HT</span>
    </div>
  </div>` : ''}

  ${topFund ? `
  <!-- Financement -->
  <div style="background:#ECFDF5;border-radius:16px;border:1px solid #A7F3D0;padding:20px;margin-bottom:24px;">
    <p style="font-size:12px;font-weight:600;color:#065F46;margin:0 0 4px;">💶 Financement potentiel</p>
    <p style="font-size:14px;font-weight:600;color:#064E3B;margin:0 0 4px;">${topFund.funder}</p>
    <p style="font-size:12px;color:#047857;margin:0;">${topFund.coverage_label}</p>
  </div>` : ''}

  <!-- CTA -->
  <div style="text-align:center;margin-bottom:24px;">
    <a href="${reportUrl}" style="display:inline-block;background:#E85D26;color:#fff;padding:14px 32px;border-radius:12px;font-weight:600;font-size:14px;text-decoration:none;">
      Voir mon rapport complet →
    </a>
    <p style="font-size:12px;color:#9CA3AF;margin-top:12px;">
      Ou appelez-nous pour vérifier votre financement gratuitement
    </p>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding-top:16px;border-top:1px solid #E5E7EB;">
    <p style="font-size:11px;color:#9CA3AF;margin:0;">
      MOJO ACADÉMIE · Formation digitale & IA certifiée Qualiopi<br>
      Ce diagnostic est indicatif. Les financements sont à confirmer auprès des organismes concernés.
    </p>
  </div>

</div>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    'MOJO ACADÉMIE <diagnostic@mojoacademie.com>',
      to:      [to],
      subject: `Votre diagnostic digital MOJO — Score ${businessScore.global}/100`,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error: ${err}`)
  }
}
