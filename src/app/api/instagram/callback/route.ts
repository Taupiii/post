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
    // 1. Échanger le code contre un Short-Lived User Access Token
    const tokenRes = await axios.get(`https://graph.facebook.com/v21.0/oauth/access_token`, {
      params: {
        client_id: appId,
        redirect_uri: redirectUri,
        client_secret: appSecret,
        code: code
      }
    });

    const shortLivedToken = tokenRes.data.access_token;

    // 2. Échanger ce token court contre un Long-Lived Token (valable 60 jours)
    const longTokenRes = await axios.get(`https://graph.facebook.com/v21.0/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken
      }
    });

    const longLivedToken = longTokenRes.data.access_token;

    // 3. Récupérer l'ID de la Page Facebook et le Compte Instagram Business lié
    const pagesRes = await axios.get(`https://graph.facebook.com/v21.0/me/accounts`, {
      params: { access_token: longLivedToken }
    });

    let igAccountId = null;
    let igUsername = null;
    const pages = pagesRes.data.data;

    if (pages && pages.length > 0) {
      for (const page of pages) {
        try {
          const igRes = await axios.get(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account`, {
            params: { access_token: longLivedToken }
          });
          if (igRes.data.instagram_business_account) {
            igAccountId = igRes.data.instagram_business_account.id;
            
            // fetch username
            const profileRes = await axios.get(`https://graph.facebook.com/v21.0/${igAccountId}?fields=username`, {
              params: { access_token: longLivedToken }
            });
            igUsername = profileRes.data.username;
            
            break;
          }
        } catch {
          // Ignorer si cette page n'a pas IG
        }
      }
    }

    return new NextResponse(`
      <html>
        <body style="font-family: sans-serif; padding: 2rem; background: #0f172a; color: white;">
          <h2>Authentification Instagram (Meta) réussie ! 🎉</h2>
          
          ${igUsername ? `<p>Compte connecté : <strong>@${igUsername}</strong></p>` : ''}

          <p>Voici votre Token long-terme (valable 60 jours) :</p>
          <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; word-break: break-all;">
            <code>${longLivedToken}</code>
          </div>

          <p>Voici votre ID de compte Instagram Business :</p>
          <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 8px; margin-bottom: 2rem;">
            <code>${igAccountId || "⚠️ Aucun compte Instagram Business lié trouvé sur votre Page Facebook."}</code>
          </div>

          <p><strong>Étape suivante :</strong> Copiez ces infos dans votre fichier <code>.env</code> :</p>
          <pre style="background: black; padding: 1rem; border-radius: 8px; color: #10b981;">
INSTAGRAM_ACCESS_TOKEN="${longLivedToken}"
INSTAGRAM_ACCOUNT_ID="${igAccountId || 'METTRE_VOTRE_IG_ID_ICI'}"
          </pre>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });

  } catch (err: any) {
    console.error("Erreur OAuth Instagram callback :", err.response?.data || err.message);
    return NextResponse.json({ 
      error: err.response?.data?.error?.message || err.message,
      details: err.response?.data
    }, { status: 500 });
  }
}
