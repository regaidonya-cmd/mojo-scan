// Alerte HOT lead — envoi immédiat à la conseillère MOJO

export async function sendHotLeadAlert(data: {
  firstname: string
  lastname?: string
  email: string
  phone?: string
  company?: string
  lead_score: number
  priority: string
  formation_1: string
  diagnostic_id: string
  report_url: string
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  const alertEmail = process.env.HOT_LEAD_ALERT_EMAIL ?? process.env.BREVO_SENDER_EMAIL ?? 'regai.donya@mojoacademie.com'
  if (!apiKey) return

  const level = data.lead_score >= 75 ? '🔥 HOT' : data.lead_score >= 50 ? '⚡ WARM' : null
  if (!level) return // Pas d'alerte pour les leads froids

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px">
      <div style="background:#1A186E;padding:20px;border-radius:12px 12px 0 0;color:#fff">
        <p style="margin:0;font-size:22px;font-weight:800">${level} LEAD — Action requise</p>
        <p style="margin:6px 0 0;font-size:13px;opacity:0.7">Score : ${data.lead_score}/100</p>
      </div>
      <div style="background:#fff;border:1px solid #EDEAF5;border-radius:0 0 12px 12px;padding:20px">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          ${[
            ['Prospect', `<strong>${data.firstname} ${data.lastname ?? ''}</strong>`],
            ['Email', `<a href="mailto:${data.email}">${data.email}</a>`],
            ['Téléphone', data.phone ?? '—'],
            ['Entreprise', data.company ?? '—'],
            ['Priorité', data.priority],
            ['Formation #1', data.formation_1],
          ].map(([k, v]) => `
            <tr style="border-bottom:1px solid #F0EEF8">
              <td style="padding:8px 4px;color:#6B6680;width:100px">${k}</td>
              <td style="padding:8px 4px;color:#1A186E;font-weight:500">${v}</td>
            </tr>
          `).join('')}
        </table>
        <div style="margin-top:20px;text-align:center">
          <a href="${data.report_url}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#6B35B8,#C8399A);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;margin-right:8px">
            Voir le rapport →
          </a>
          <a href="mailto:${data.email}" style="display:inline-block;padding:12px 24px;border:2px solid #6B35B8;color:#6B35B8;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px">
            Contacter →
          </a>
        </div>
      </div>
    </div>
  `

  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'MOJO Lead Engine', email: alertEmail },
        to: [{ email: alertEmail, name: 'MOJO ACADÉMIE' }],
        subject: `${level} — ${data.firstname} ${data.lastname ?? ''} (${data.company ?? data.email}) — Score ${data.lead_score}/100`,
        htmlContent: html,
        tags: ['hot-lead-alert'],
      }),
    })
    console.log(`[HOT LEAD] Alerte envoyée — Score: ${data.lead_score}`)
  } catch (e) {
    console.error('[HOT LEAD] Erreur alerte:', e)
  }
}
