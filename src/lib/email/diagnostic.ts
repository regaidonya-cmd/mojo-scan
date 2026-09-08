// ══════════════════════════════════════════════════════════════
// MOJO Lead Engine — Email transactionnel diagnostic
// Via Brevo Transactional API
// Couleurs officielles MOJO ACADÉMIE v6
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
  const calendly   = d.calendly_url ?? 'https://calendly.com/regai-donya/diagnostic-digital-offert-10-min-passez-a-l-action'
  const reportUrl  = d.report_url   ?? calendly

  // Couleurs officielles MOJO ACADÉMIE v6
  const NIGHT   = '#1A186E'
  const VIOLET  = '#6B35B8'
  const FUCHSIA = '#C8399A'
  const LAV     = '#EDE9FB'
  const OFF     = '#F7F6FC'
  const TEXT    = '#111020'
  const MUTED   = '#6B6680'
  const BORDER  = '#EDEAF5'
  const GRAD    = `linear-gradient(135deg, ${VIOLET}, ${FUCHSIA})`

  const parcoursBlock = d.parcours_nom ? `
    <tr><td style="padding:0 32px 20px">
      <div style="background:${LAV};border-left:3px solid ${VIOLET};padding:14px 16px;border-radius:0 8px 8px 0">
        <p style="font-size:10px;font-weight:700;color:${VIOLET};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;font-family:'Plus Jakarta Sans',Arial,sans-serif">Parcours métier identifié</p>
        <p style="font-size:14px;font-weight:700;color:${NIGHT};margin:0 0 4px;font-family:'Bricolage Grotesque','Arial Black',Arial,sans-serif">${d.parcours_nom}</p>
        <p style="font-size:13px;color:${MUTED};margin:0;font-family:'Plus Jakarta Sans',Arial,sans-serif">${d.parcours_promesse ?? ''}</p>
      </div>
    </td></tr>
  ` : ''

  const autres = [d.formation_2_titre, d.formation_3_titre].filter(Boolean)
  const autresBlock = autres.length > 0 ? `
    <tr><td style="padding:0 32px 20px">
      <p style="font-size:12px;font-weight:600;color:${MUTED};margin:0 0 8px;font-family:'Plus Jakarta Sans',Arial,sans-serif">Autres formations recommandées :</p>
      ${autres.map(t => `<p style="font-size:13px;color:${MUTED};margin:4px 0;font-family:'Plus Jakarta Sans',Arial,sans-serif">→ ${t}</p>`).join('')}
    </td></tr>
  ` : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Votre diagnostic MOJO ACADÉMIE</title>
</head>
<body style="margin:0;padding:0;background:${OFF};font-family:'Plus Jakarta Sans',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${OFF};padding:24px 16px">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">

    <!-- HEADER -->
    <tr><td style="background:${NIGHT};padding:28px 32px 24px;border-radius:16px 16px 0 0">
      <p style="margin:0 0 6px;font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:0.12em;text-transform:uppercase;font-family:'Plus Jakarta Sans',Arial,sans-serif">Diagnostic digital & IA</p>
      <h1 style="margin:0;font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.03em;font-family:'Bricolage Grotesque','Arial Black',Arial,sans-serif">MOJO ACADÉMIE</h1>
    </td></tr>

    <!-- CORPS -->
    <tr><td style="background:#fff;padding:28px 32px 0">
      <p style="font-size:15px;color:${NIGHT};margin:0 0 16px;font-family:'Plus Jakarta Sans',Arial,sans-serif">
        Bonjour <strong>${d.to_name}</strong>,
      </p>
      <p style="font-size:14px;color:${MUTED};line-height:1.6;margin:0 0 24px;font-family:'Plus Jakarta Sans',Arial,sans-serif">
        Votre diagnostic MOJO ACADÉMIE${d.company ? ` pour <strong style="color:${NIGHT}">${d.company}</strong>` : ''} est prêt.
        Voici la priorité principale que nous avons identifiée pour votre activité.
      </p>
    </td></tr>

    <!-- PRIORITÉ -->
    <tr><td style="background:#fff;padding:0 32px 20px">
      <div style="background:${OFF};border-radius:12px;padding:16px 18px">
        <p style="font-size:10px;font-weight:700;color:${VIOLET};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;font-family:'Plus Jakarta Sans',Arial,sans-serif">Votre priorité principale</p>
        <p style="font-size:16px;font-weight:700;color:${NIGHT};margin:0 0 6px;font-family:'Bricolage Grotesque','Arial Black',Arial,sans-serif">${d.priority_label}</p>
        <p style="font-size:13px;color:${MUTED};margin:0;line-height:1.5;font-family:'Plus Jakarta Sans',Arial,sans-serif">${d.priority_detail}</p>
      </div>
    </td></tr>

    <!-- FORMATION #1 -->
    <tr><td style="background:#fff;padding:0 32px 20px">
      <div style="border:2px solid ${FUCHSIA};border-radius:14px;padding:18px">
        <p style="font-size:10px;font-weight:700;color:${FUCHSIA};text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;font-family:'Plus Jakarta Sans',Arial,sans-serif">Formation recommandée</p>
        <p style="font-size:16px;font-weight:700;color:${NIGHT};margin:0 0 6px;line-height:1.3;font-family:'Bricolage Grotesque','Arial Black',Arial,sans-serif">${d.formation_1_titre}</p>
        <p style="font-size:13px;color:${MUTED};font-style:italic;margin:0 0 14px;font-family:'Plus Jakarta Sans',Arial,sans-serif">${d.formation_1_promesse}</p>
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-right:8px">
              <span style="font-size:12px;font-weight:700;padding:4px 12px;border-radius:99px;background:${LAV};color:${VIOLET};font-family:'Plus Jakarta Sans',Arial,sans-serif;display:inline-block">⏱ ${d.formation_1_duree}h</span>
            </td>
            <td>
              <span style="font-size:12px;font-weight:700;padding:4px 12px;border-radius:99px;background:#FBF0F7;color:${FUCHSIA};font-family:'Plus Jakarta Sans',Arial,sans-serif;display:inline-block">${d.formation_1_tarif.toLocaleString('fr-FR')} € HT</span>
            </td>
          </tr>
        </table>
      </div>
    </td></tr>

    ${autresBlock}
    ${parcoursBlock}

    <!-- FINANCEMENT -->
    <tr><td style="background:#fff;padding:0 32px 24px">
      <div style="background:#F0FFF4;border-radius:12px;padding:14px 16px">
        <p style="font-size:13px;color:#166534;line-height:1.6;margin:0;font-family:'Plus Jakarta Sans',Arial,sans-serif">
          Selon votre situation, cette formation peut éventuellement faire l'objet d'une prise en charge par votre OPCO ou votre fonds de formation, sous réserve des critères en vigueur.
        </p>
      </div>
    </td></tr>

    <!-- CTA PRINCIPAL -->
    <tr><td style="background:#fff;padding:0 32px 12px;text-align:center">
      <a href="${calendly}?utm_source=mojo_lead_engine&utm_medium=email&utm_campaign=diagnostic"
         style="display:inline-block;background:${NIGHT};color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:12px;font-family:'Plus Jakarta Sans',Arial,sans-serif">
        📅 Échanger sur mon diagnostic
      </a>
    </td></tr>

    <!-- CTA SECONDAIRE -->
    <tr><td style="background:#fff;padding:0 32px 32px;text-align:center">
      <a href="${reportUrl}"
         style="font-size:13px;color:${VIOLET};text-decoration:underline;font-family:'Plus Jakarta Sans',Arial,sans-serif">
        Consulter mon rapport complet →
      </a>
    </td></tr>

    <!-- FOOTER -->
    <tr><td style="background:${OFF};padding:18px 32px;border-radius:0 0 16px 16px;border-top:1px solid ${BORDER}">
      <p style="font-size:11px;color:${MUTED};margin:0;line-height:1.6;text-align:center;font-family:'Plus Jakarta Sans',Arial,sans-serif">
        MOJO ACADÉMIE — Organisme de formation certifié Qualiopi<br>
        Vous recevez cet email car vous avez demandé votre diagnostic digital.<br>
        <a href="#" style="color:${MUTED}">Se désabonner</a>
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

  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'regai.donya@mojoacademie.com'

  try {
    const html    = buildEmailHtml(data)
    const subject = `Votre diagnostic digital & IA${data.company ? ` — ${data.company}` : ''} | MOJO ACADÉMIE`

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender:      { name: 'MOJO ACADÉMIE', email: senderEmail },
        to:          [{ email: data.to_email, name: data.to_name }],
        subject,
        htmlContent: html,
        tags:        ['diagnostic', 'mojo-lead-engine'],
      }),
    })

    if (res.ok) {
      const json = await res.json().catch(() => ({}))
      console.log(`[Email] ✓ Envoyé à ${data.to_email}`)
      return { success: true, message_id: json.messageId }
    }

    const err    = await res.json().catch(() => ({}))
    const errMsg = `SMTP ${res.status}: ${err.message ?? 'error'}`
    console.error(`[Email] ✗ ${errMsg}`)
    return { success: false, error: errMsg }

  } catch (e: any) {
    console.error('[Email] Exception:', e.message)
    return { success: false, error: e.message }
  }
}
