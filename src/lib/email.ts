import nodemailer from 'nodemailer';

interface FailureDetails {
  message: string;
  code?: string | number;
  apiResponse?: any;
}

export async function sendFailureAlert(platform: string, postId: string, error: string | FailureDetails) {
  const { EMAIL_FROM, EMAIL_TO, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_TO || !EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    console.warn('[EMAIL] Configuration email manquante, alerte non envoyée.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: parseInt(EMAIL_PORT || '587'),
    secure: parseInt(EMAIL_PORT || '587') === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });

  const platformName = { ig: 'Instagram', tt: 'TikTok', yt: 'YouTube' }[platform] || platform;
  const platformIcon = { ig: '📸', tt: '🎵', yt: '▶️' }[platform] || '⚠️';
  const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

  // Normalise l'erreur en objet structuré
  const details: FailureDetails = typeof error === 'string'
    ? { message: error }
    : error;

  const apiJson = details.apiResponse
    ? JSON.stringify(details.apiResponse, null, 2)
    : null;

  await transporter.sendMail({
    from: EMAIL_FROM || EMAIL_USER,
    to: EMAIL_TO,
    subject: `⚠️ Kwikwiii — Échec ${platformIcon} ${platformName} — ${details.code ? `[${details.code}]` : ''}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; background: #0f172a; color: #f1f5f9; border-radius: 12px; overflow: hidden;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #7c3aed, #db2777); padding: 24px 32px;">
          <h2 style="margin: 0; font-size: 1.3rem; color: white;">⚠️ Échec de publication Kwikwiii</h2>
          <p style="margin: 6px 0 0; color: rgba(255,255,255,0.8); font-size: 0.9rem;">${date}</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px 32px;">

          <!-- Platform badge -->
          <div style="display: inline-block; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 6px 14px; margin-bottom: 20px; font-size: 0.95rem; font-weight: bold;">
            ${platformIcon} ${platformName}
          </div>

          <!-- Info table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9rem;">
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
              <td style="padding: 10px 0; color: #94a3b8; width: 120px;">Post ID</td>
              <td style="padding: 10px 0; font-family: monospace; color: #e2e8f0;">${postId}</td>
            </tr>
            ${details.code ? `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
              <td style="padding: 10px 0; color: #94a3b8;">Code erreur</td>
              <td style="padding: 10px 0; font-family: monospace; color: #f87171;">${details.code}</td>
            </tr>` : ''}
          </table>

          <!-- Error message -->
          <div style="margin-bottom: 20px;">
            <p style="color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Message d'erreur</p>
            <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 14px 16px; color: #fca5a5; font-size: 0.95rem;">
              ${details.message}
            </div>
          </div>

          <!-- Full API response -->
          ${apiJson ? `
          <div style="margin-bottom: 20px;">
            <p style="color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Réponse complète de l'API</p>
            <pre style="background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 14px 16px; color: #e2e8f0; font-size: 0.8rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">${apiJson}</pre>
          </div>` : ''}

          <!-- CTA -->
          <a href="${process.env.PUBLIC_URL || 'https://postrs.kwikwiii.online'}/dashboard/calendar"
             style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #db2777); color: white; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: bold; font-size: 0.9rem;">
            Voir le calendrier →
          </a>
        </div>

        <!-- Footer -->
        <div style="padding: 16px 32px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 0.78rem; color: #475569;">
          Kwikwiii Automator — Cet email a été envoyé automatiquement suite à un échec de publication.
        </div>
      </div>
    `,
  });

  console.log(`[EMAIL] Alerte d'échec envoyée pour ${platformName} post ${postId}`);
}
