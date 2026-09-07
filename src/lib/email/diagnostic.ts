// ══════════════════════════════════════════════════════════════
// MOJO Lead Engine — Email transactionnel diagnostic
// Via Brevo Transactional API (pas de campagne marketing)
// ══════════════════════════════════════════════════════════════

interface DiagnosticEmailData {
  to_email: string
  to_name: string
  company?: string
  priority_label: string
  priority_detail: string
  formation_1_titre: string
  formation_1_duree: number
  formation_1_tarif: number
  formation_1_promesse: string
  formation_2_titre?: string
  formation_3_titre?: string
  parcours_nom?: string
  parcours_promesse?: string
  report_url?: string
  calendly_url?: string
}

function buildEmailHtml(d: DiagnosticEmailData): string {
  const calendly = d.calendly_url ?? 'https://calendly.com/mojoacademie'
  const reportUrl = d.report_url ?? calendly

  const parcoursBlock = d.parcours_nom ? `
    <div style="background:#F5F0FF;border-left:3px solid #7B3FCC;padding:14px 16px;margin:20px 0;border-radius:0 8px 8px 0">
      <p style="font-size:11px;font-weight:700;color:#7B3FCC;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px">Parcours métier identifié</p>
      <p style="font-size:14px;font-weight:700;color:#1A186E;margin:0 0 4px">${d.parcours_nom}</p>
      <p style="font-size:13px;color:#4B5563;margin:0">${d.parcours_promesse ?? ''}</p>
    </div>
  ` : ''

  const autres = [d.formation_2_titre, d.formation_3_titre].filter(Boolean)
  const autresBlock = autres.length > 0 ? `
    <p style="font-size:13px;font-weight:600;color:#4B5563;margin:20px 0 10px">Autres formations recommandées :</p>
    ${autres.map((t, i) => `<p style="font-size:13px;color:#4B5563;margin:4px 0">→ ${t}</p>`).join('')}
  ` : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F7FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F7FF;padding:24px 16px">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#fff;border-radius:20px;overflow:hidden">

      <!-- Header -->
      <tr><td style="background:#1A186E;padding:28px 28px 24px">
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:0.1em;text-transform:uppercase">Diagnostic digital & IA</p>
        <h1 style="margin:6px 0 0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.03em">MOJO Académie</h1>
      </td></tr>

      <!-- Corps -->
      <tr><td style="padding:28px">

        <p style="font-size:15px;color:#1A186E;margin:0 0 20px">
          Bonjour <strong>${d.to_name}</strong>,
        </p>

        <p style="font-size:14px;color:#4B5563;line-height:1.6;margin:0 0 20px">
          Votre diagnostic MOJO${d.company ? ` pour <strong>${d.company}</strong>` : ''} est prêt.
          Nous avons identifié une priorité principale pour votre activité.
        </p>

        <!-- Priorité -->
        <div style="background:#F8F7FF;border-radius:14px;padding:16px 18px;margin:0 0 20px">
          <p style="font-size:11px;font-weight:700;color:#7B3FCC;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px">Votre priorité principale</p>
          <p style="font-size:16px;font-weight:700;color:#1A186E;margin:0 0 6px">${d.priority_label}</p>
          <p style="font-size:13px;color:#4B5563;margin:0;line-height:1.5">${d.priority_detail}</p>
        </div>

        <!-- Formation #1 -->
        <div style="border:2px solid #E040AB;border-radius:14px;padding:18px;margin:0 0 20px">
          <p style="font-size:10px;font-weight:700;color:#E040AB;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px">Formation recommandée</p>
          <p style="font-size:16px;font-weight:700;color:#1A186E;margin:0 0 6px;line-height:1.3">${d.formation_1_titre}</p>
          <p style="font-size:13px;color:#4B5563;font-style:italic;margin:0 0 12px">${d.formation_1_promesse}</p>
          <div style="display:inline-flex;gap:8px">
            <span style="font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px;background:#F5F0FF;color:#7B3FCC">⏱ ${d.formation_1_duree}h</span>
            <span style="font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px;background:#FDF0F7;color:#E040AB">${d.formation_1_tarif.toLocaleString('fr-FR')} € HT</span>
          </div>
        </div>

        ${autresBlock}
        ${parcoursBlock}

        <!-- Financement -->
        <div style="background:#F0FFF4;border-radius:12px;padding:14px 16px;margin:0 0 24px">
          <p style="font-size:13px;color:#166534;line-height:1.6;margin:0">
            Selon votre situation, cette formation peut éventuellement faire l'objet d'une prise en charge par votre OPCO ou votre fonds de formation, sous réserve des critères en vigueur.
          </p>
        </div>

        <!-- CTA principal -->
        <div style="text-align:center;margin:0 0 12px">
          <a href="${calendly}?utm_source=mojo_lead_engine&utm_medium=email&utm_campaign=diagnostic" style="display:inline-block;background:linear-gradient(135deg,#9B2FCC,#E040AB);color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;border:none">
            📅 Échanger sur mon diagnostic
          </a>
        </div>

        <!-- CTA secondaire -->
        <div style="text-align:center;margin:0 0 28px">
          <a href="${reportUrl}" style="font-size:13px;color:#7B3FCC;text-decoration:underline">
            Consulter mon rapport complet →
          </a>
        </div>

      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#F8F7FF;padding:18px 28px;border-top:1px solid #E5E7EB">
        <p style="font-size:11px;color:#9CA3AF;margin:0;line-height:1.6;text-align:center">
          MOJO Académie — Organisme de formation certifié Qualiopi<br>
          Vous recevez cet email car vous avez demandé votre diagnostic digital.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

export async function sendDiagnosticEmail(data: DiagnosticEmailData): Promise<{
  success: boolean
  error?: string
  message_id?: string
}> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.warn('[Email] BREVO_API_KEY manquante')
    return { success: false, error: 'BREVO_API_KEY manquante' }
  }

  try {
    const html = buildEmailHtml(data)
    const subject = `Votre diagnostic digital & IA${data.company ? ` — ${data.company}` : ''}`

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'MOJO Académie',
          email: process.env.BREVO_SENDER_EMAIL ?? 'diagnostic@mojoacademie.com',
        },
        to: [{ email: data.to_email, name: data.to_name }],
        subject,
        htmlContent: html,
        tags: ['diagnostic', 'mojo-lead-engine'],
      }),
    })

    if (res.ok) {
      const json = await res.json().catch(() => ({}))
      console.log(`[Email] ✓ Envoyé à ${data.to_email}`)
      return { success: true, message_id: json.messageId }
    }

    const err = await res.json().catch(() => ({}))
    console.error(`[Email] ✗ Brevo SMTP ${res.status}:`, err)
    return { success: false, error: `SMTP ${res.status}: ${err.message ?? 'error'}` }

  } catch (e: any) {
    console.error('[Email] Exception:', e.message)
    return { success: false, error: e.message }
  }
}
