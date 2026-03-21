import nodemailer from 'nodemailer';

export async function sendFailureAlert(platform: string, postId: string, error: string) {
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
  const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

  await transporter.sendMail({
    from: EMAIL_FROM || EMAIL_USER,
    to: EMAIL_TO,
    subject: `⚠️ Kwikwiii — Échec de publication sur ${platformName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c0392b;">⚠️ Échec de publication</h2>
        <p>Une publication n'a pas pu être envoyée automatiquement par Kwikwiii Automator.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f8f8f8;">
            <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">Plateforme</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${platformName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">ID du post</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${postId}</td>
          </tr>
          <tr style="background: #f8f8f8;">
            <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">Date</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">Erreur</td>
            <td style="padding: 8px; border: 1px solid #ddd; color: #c0392b;">${error}</td>
          </tr>
        </table>
        <p style="margin-top: 1rem;">Connectez-vous à <a href="${process.env.PUBLIC_URL || 'https://postrs.kwikwiii.online'}">Kwikwiii</a> pour vérifier l'état de vos publications.</p>
        <p style="color: #999; font-size: 0.85em;">— Kwikwiii Automator</p>
      </div>
    `,
  });

  console.log(`[EMAIL] Alerte d'échec envoyée pour ${platformName} post ${postId}`);
}
