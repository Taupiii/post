import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error_description') || url.searchParams.get('error');

  if (error) {
    return NextResponse.json({ error: `Authentification annulée ou échouée: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Code d'autorisation manquant." }, { status: 400 });
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || 'https://localhost:3000/api/tiktok/callback';

  if (!clientKey || !clientSecret) {
    return NextResponse.json({ error: "Configuration TikTok manquante." }, { status: 500 });
  }

  try {
    // Échanger le code OAuth pour obtenir l'Access Token TikTok
    const formUrlEncoded = new URLSearchParams();
    formUrlEncoded.append('client_key', clientKey);
    formUrlEncoded.append('client_secret', clientSecret);
    formUrlEncoded.append('code', code);
    formUrlEncoded.append('grant_type', 'authorization_code');
    formUrlEncoded.append('redirect_uri', redirectUri);

    const tokenRes = await axios.post(`https://open.tiktokapis.com/v2/oauth/token/`, formUrlEncoded.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      }
    });

    const accessToken = tokenRes.data.access_token;
    const refreshToken = tokenRes.data.refresh_token;

    return new NextResponse(`
      <html>
        <body style="font-family: sans-serif; padding: 2rem; background: #0f172a; color: white;">
          <h2>Authentification TikTok réussie ! 🎉</h2>
          
          <p>Voici votre Access Token TikTok :</p>
          <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; word-break: break-all;">
            <code>${accessToken}</code>
          </div>

          <p>Voici votre Refresh Token TikTok :</p>
          <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 8px; margin-bottom: 2rem; word-break: break-all;">
            <code>${refreshToken}</code>
          </div>

          <p><strong>Étape suivante :</strong> Copiez ces infos dans votre fichier <code>.env</code> :</p>
          <pre style="background: black; padding: 1rem; border-radius: 8px; color: #10b981;">
TIKTOK_ACCESS_TOKEN="${accessToken}"
TIKTOK_REFRESH_TOKEN="${refreshToken}"
          </pre>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });

  } catch (err: any) {
    console.error("Erreur OAuth TikTok callback :", err.response?.data || err.message);
    return NextResponse.json({ error: "Erreur lors de l'échange du token TikTok." }, { status: 500 });
  }
}
