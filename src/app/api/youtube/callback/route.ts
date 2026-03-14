import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.json({ error: "Authentification annulée ou échouée." }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Code d'autorisation manquant." }, { status: 400 });
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/youtube/callback';

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Configuration YouTube manquante." }, { status: 500 });
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // We display the refresh token to the user so they can copy-paste it to .env
    return new NextResponse(`
      <html>
        <body style="font-family: sans-serif; padding: 2rem; background: #0f172a; color: white;">
          <h2>Authentification YouTube réussie ! 🎉</h2>
          <p>Voici votre Refresh Token. Gardez-le secret.</p>
          <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 8px; margin-bottom: 2rem; word-break: break-all;">
            <code>${tokens.refresh_token || "Aucun refresh token renvoyé (avez-vous déjà autorisé l'app ? Essayez de révoquer l'accès depuis votre compte Google et recommencez)."}</code>
          </div>
          <p><strong>Étape suivante :</strong></p>
          <p>Copiez ce texte et ajoutez-le dans votre fichier <code>.env</code> :</p>
          <pre style="background: black; padding: 1rem; border-radius: 8px; color: #10b981;">YOUTUBE_REFRESH_TOKEN="${tokens.refresh_token || 'VOTRE_TOKEN'}"</pre>
          <p>Ensuite, redémarrez votre serveur (<code>npm run dev</code>).</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (err: any) {
    console.error("Erreur OAuth callback :", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
