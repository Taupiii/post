import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error_reason') || url.searchParams.get('error');

  if (error) {
    return NextResponse.json({ error: "Authentification annulée ou échouée." }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Code d'autorisation manquant." }, { status: 400 });
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'https://localhost:3000/api/instagram/callback';

  if (!appId || !appSecret) {
    return NextResponse.json({ error: "Configuration Instagram manquante." }, { status: 500 });
  }

  try {
    // 1. Échanger le code contre un Short-Lived Token via le nouveau endpoint Instagram
    const tokenRes = await axios.post('https://api.instagram.com/oauth/access_token', 
      new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const shortLivedToken = tokenRes.data.access_token;
    const userId = tokenRes.data.user_id;

    // 2. Échanger ce token court contre un Long-Lived Token (valable 60 jours)
    const longTokenRes = await axios.get('https://graph.instagram.com/access_token', {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: appSecret,
        access_token: shortLivedToken
      }
    });

    const longLivedToken = longTokenRes.data.access_token;

    // 3. Récupérer les infos du profil Instagram
    const profileRes = await axios.get(`https://graph.instagram.com/v21.0/me`, {
      params: {
        fields: 'user_id,username',
        access_token: longLivedToken
      }
    });

    const username = profileRes.data.username || 'Inconnu';
    const igUserId = profileRes.data.user_id || userId;

    return new NextResponse(`
      <html>
        <body style="font-family: sans-serif; padding: 2rem; background: #0f172a; color: white;">
          <h2>Authentification Instagram réussie ! 🎉</h2>
          
          <p>Compte connecté : <strong>@${username}</strong></p>

          <p>Voici votre Token long-terme (valable 60 jours) :</p>
          <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; word-break: break-all;">
            <code>${longLivedToken}</code>
          </div>

          <p>Voici votre ID de compte Instagram :</p>
          <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 8px; margin-bottom: 2rem;">
            <code>${igUserId}</code>
          </div>

          <p><strong>Étape suivante :</strong> Copiez ces infos dans votre fichier <code>.env</code> :</p>
          <pre style="background: black; padding: 1rem; border-radius: 8px; color: #10b981;">
INSTAGRAM_ACCESS_TOKEN="${longLivedToken}"
INSTAGRAM_ACCOUNT_ID="${igUserId}"
          </pre>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });

  } catch (err: any) {
    console.error("Erreur OAuth Instagram callback :", err.response?.data || err.message);
    return NextResponse.json({ error: err.response?.data?.error?.message || err.response?.data?.error_message || err.message }, { status: 500 });
  }
}
