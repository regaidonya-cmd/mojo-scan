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
  report_url?: string
  calendly_url?: string
  funder?: string
}

function buildEmailHtml(d: DiagnosticEmailData): string {
  const calendly  = d.calendly_url ?? 'https://calendly.com/regai-donya/diagnostic-digital-offert-10-min-passez-a-l-action'
  const reportUrl = d.report_url ?? calendly

  // Nom entreprise sans répétition MOJO ACADÉMIE/MOJO ACADÉMIE
  const entrepriseLabel = d.company && d.company.toLowerCase() !== 'mojo académie' && d.company.toLowerCase() !== 'mojo academie'
    ? ` pour <strong style="color:#1A186E">${d.company}</strong>`
    : ''

  const autresBlock = [d.formation_2_titre, d.formation_3_titre].filter(Boolean).map(t =>
    `<p style="font-size:13px;color:#6B6680;margin:4px 0;font-family:Arial,sans-serif">→ ${t}</p>`
  ).join('')

  const parcoursBlock = d.parcours_nom ? `
    <tr><td style="padding:0 28px 18px">
      <div style="background:#EDE9FB;border-left:3px solid #6B35B8;padding:12px 14px;border-radius:0 8px 8px 0">
        <p style="font-size:11px;font-weight:700;color:#6B35B8;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px;font-family:Arial,sans-serif">Parcours métier identifié</p>
        <p style="font-size:14px;font-weight:700;color:#1A186E;margin:0;font-family:Arial,sans-serif">${d.parcours_nom}</p>
      </div>
    </td></tr>
  ` : ''

  const funderBlock = d.funder ? `
    <p style="font-size:13px;color:#166534;margin:0 0 4px;font-family:Arial,sans-serif">
      <strong>Financement potentiel identifié :</strong> ${d.funder}
    </p>
  ` : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F6FC;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6FC;padding:20px 12px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">

  <!-- HEADER -->
  <tr><td style="background:#1A186E;padding:24px 28px 20px;border-radius:14px 14px 0 0">
    <p style="margin:0 0 4px;font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif">Diagnostic digital & IA</p>
    <p style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.02em;font-family:Arial,sans-serif">MOJO ACADÉMIE</p>
  </td></tr>

  <!-- INTRO orientée conversion -->
  <tr><td style="background:#fff;padding:24px 28px 0">
    <p style="font-size:15px;color:#1A186E;margin:0 0 14px;font-family:Arial,sans-serif">
      Bonjour <strong>${d.to_name}</strong>,
    </p>
    <p style="font-size:14px;color:#6B6680;line-height:1.65;margin:0 0 6px;font-family:Arial,sans-serif">
      Votre diagnostic${entrepriseLabel} est prêt. Nous avons identifié 3 leviers prioritaires pour développer votre activité.
    </p>
    <p style="font-size:14px;color:#6B6680;line-height:1.65;margin:0 0 20px;font-family:Arial,sans-serif">
      Le premier concerne <strong style="color:#1A186E">${d.priority_label.toLowerCase()}</strong>.
    </p>
  </td></tr>

  <!-- FORMATION #1 — mise en avant -->
  <tr><td style="background:#fff;padding:0 28px 18px">
    <div style="border:2px solid #C8399A;border-radius:12px;padding:16px">
      <p style="font-size:10px;font-weight:700;color:#C8399A;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px;font-family:Arial,sans-serif">Formation recommandée en priorité</p>
      <p style="font-size:15px;font-weight:700;color:#1A186E;margin:0 0 4px;line-height:1.3;font-family:Arial,sans-serif">${d.formation_1_titre}</p>
      <p style="font-size:12px;color:#6B6680;font-style:italic;margin:0 0 12px;font-family:Arial,sans-serif">${d.formation_1_promesse}</p>
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:6px"><span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;background:#EDE9FB;color:#6B35B8;font-family:Arial,sans-serif;display:inline-block">⏱ ${d.formation_1_duree}h</span></td>
        <td><span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;background:#FBF0F7;color:#C8399A;font-family:Arial,sans-serif;display:inline-block">${d.formation_1_tarif.toLocaleString('fr-FR')} € HT</span></td>
      </tr></table>
    </div>
  </td></tr>

  ${autresBlock ? `<tr><td style="background:#fff;padding:0 28px 16px"><p style="font-size:12px;font-weight:600;color:#6B6680;margin:0 0 8px;font-family:Arial,sans-serif">Recommandations complémentaires :</p>${autresBlock}</td></tr>` : ''}
  ${parcoursBlock}

  <!-- FINANCEMENT -->
  <tr><td style="background:#fff;padding:0 28px 20px">
    <div style="background:#F0FFF4;border-radius:10px;padding:14px">
      <p style="font-size:10px;font-weight:700;color:#16A34A;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;font-family:Arial,sans-serif">Financement potentiel</p>
      ${funderBlock}
      <p style="font-size:12px;color:#166534;line-height:1.55;margin:0;font-family:Arial,sans-serif">
        Des solutions de financement peuvent exister selon votre situation. MOJO ACADÉMIE peut vérifier avec vous le dispositif applicable à votre dossier.
      </p>
    </div>
  </td></tr>

  <!-- CTA PRINCIPAL — bénéfice -->
  <tr><td style="background:#fff;padding:0 28px 12px;text-align:center">
    <a href="${calendly}?utm_source=mojo_lead_engine&utm_medium=email"
       style="display:inline-block;background:#1A186E;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;font-family:Arial,sans-serif">
      Vérifier mon plan d'action et mon financement →
    </a>
    <p style="font-size:11px;color:#A09BB8;margin:8px 0 0;font-family:Arial,sans-serif">Gratuit · 20 min · Sans engagement</p>
  </td></tr>

  <!-- CTA secondaire rapport -->
  <tr><td style="background:#fff;padding:0 28px 24px;text-align:center">
    <a href="${reportUrl}" style="font-size:12px;color:#6B35B8;text-decoration:underline;font-family:Arial,sans-serif">
      Consulter mon rapport complet →
    </a>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#F7F6FC;padding:16px 28px;border-radius:0 0 14px 14px;border-top:1px solid #EDEAF5;text-align:center">
    <p style="font-size:11px;color:#A09BB8;margin:0;line-height:1.6;font-family:Arial,sans-serif">
      MOJO ACADÉMIE — Organisme de formation certifié Qualiopi<br>
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
  success: boolean; error?: string; message_id?: string
}> {
  const apiKey      = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'regai.donya@mojoacademie.com'
  if (!apiKey) return { success: false, error: 'BREVO_API_KEY manquante' }

  try {
    const subject = `Votre diagnostic MOJO ACADÉMIE${data.company && data.company.toLowerCase() !== 'mojo académie' ? ` — ${data.company}` : ''}`
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender:      { name: 'MOJO ACADÉMIE', email: senderEmail },
        to:          [{ email: data.to_email, name: data.to_name }],
        subject,
        htmlContent: buildEmailHtml(data),
        tags:        ['diagnostic', 'mojo-lead-engine'],
      }),
    })
    if (res.ok) {
      const json = await res.json().catch(() => ({}))
      return { success: true, message_id: json.messageId }
    }
    const err = await res.json().catch(() => ({}))
    return { success: false, error: `SMTP ${res.status}: ${err.message ?? 'error'}` }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
