// ══════════════════════════════════════════════════════════════
// MOJO Lead Engine — Alerte nouveau diagnostic
// Envoi immédiat à Donya à chaque scan complété
// ══════════════════════════════════════════════════════════════

export async function sendLeadAlert(data: {
  firstname: string
  lastname?: string
  email: string
  phone?: string
  company?: string
  naf_label?: string
  city?: string
  lead_score: number
  objective: string
  formation_1: string
  opco?: string
  financeur?: string
  diagnostic_id: string
  report_url: string
}): Promise<void> {
  const apiKey     = process.env.BREVO_API_KEY
  const alertEmail = process.env.HOT_LEAD_ALERT_EMAIL ?? 'regai.donya@mojoacademie.com'
  if (!apiKey) {
    console.warn('[Alert] BREVO_API_KEY manquante — alerte non envoyée')
    return
  }

  // Niveau de priorité selon score
  const level =
    data.lead_score >= 75 ? { label: 'PRIORITAIRE', color: '#C8399A', emoji: '★' } :
    data.lead_score >= 50 ? { label: 'CHAUD',       color: '#6B35B8', emoji: '↑' } :
                            { label: 'NOUVEAU',      color: '#1A186E', emoji: '→' }

  const rows = [
    ['Prénom / Nom',   `${data.firstname} ${data.lastname ?? ''}`.trim()],
    ['Téléphone',      data.phone ?? 'Non renseigné'],
    ['Email',          data.email],
    ['Entreprise',     data.company ?? '—'],
    ['Activité',       data.naf_label ?? '—'],
    ['Ville',          data.city ?? '—'],
    ['Objectif',       data.objective],
    ['Formation #1',   data.formation_1],
    ['OPCO (orient.)', data.opco ?? 'À identifier'],
    ['Financeur',      data.financeur ?? 'À identifier'],
    ['Score lead',     `${data.lead_score}/100`],
  ]

  const tableRows = rows.map(([k, v]) => `
    <tr style="border-bottom:1px solid #EDEAF5">
      <td style="padding:9px 12px;color:#6B6680;font-size:12px;white-space:nowrap;font-weight:600">${k}</td>
      <td style="padding:9px 12px;color:#111020;font-size:13px">${v}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F7F6FC;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">

  <tr><td style="background:${level.color};padding:18px 20px;border-radius:10px 10px 0 0">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:0.1em;text-transform:uppercase">MOJO ACADÉMIE — Nouveau diagnostic</p>
    <p style="margin:6px 0 0;font-size:20px;font-weight:800;color:#fff">${level.emoji} Lead ${level.label} — Action recommandée</p>
  </td></tr>

  <tr><td style="background:#fff;border:1px solid #EDEAF5;border-top:none">
    <table width="100%" cellpadding="0" cellspacing="0">${tableRows}</table>
  </td></tr>

  <tr><td style="background:#fff;border:1px solid #EDEAF5;border-top:none;padding:16px 20px">
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td style="padding-right:8px">
        ${data.phone
          ? `<a href="tel:${data.phone.replace(/\s/g,'')}" style="display:inline-block;padding:10px 18px;background:#1A186E;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700">Appeler</a>`
          : `<span style="display:inline-block;padding:10px 18px;background:#EDEAF5;color:#A09BB8;border-radius:8px;font-size:13px">Pas de téléphone</span>`
        }
      </td>
      <td style="padding-right:8px">
        <a href="mailto:${data.email}" style="display:inline-block;padding:10px 18px;background:#EDE9FB;color:#6B35B8;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700">Envoyer un email</a>
      </td>
      <td>
        <a href="${data.report_url}" style="display:inline-block;padding:10px 18px;border:1.5px solid #EDEAF5;color:#6B6680;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700">Voir le rapport</a>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="background:#F7F6FC;padding:12px 20px;border-radius:0 0 10px 10px;border:1px solid #EDEAF5;border-top:none">
    <p style="font-size:11px;color:#A09BB8;margin:0">MOJO ACADÉMIE · Alerte automatique · scan.mojoacademie.com</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender:      { name: 'MOJO Scan', email: process.env.BREVO_SENDER_EMAIL ?? 'regai.donya@mojoacademie.com' },
        to:          [{ email: alertEmail, name: 'Donya — MOJO ACADÉMIE' }],
        subject:     `[${level.label}] ${data.firstname} ${data.lastname ?? ''} — ${data.company ?? data.email} — Score ${data.lead_score}/100`,
        htmlContent: html,
        tags:        ['lead-alert'],
      }),
    })
    console.log(`[Alert] Alerte envoyée — ${data.email} (score: ${data.lead_score})`)
  } catch (e) {
    console.error('[Alert] Erreur:', e)
  }
}
