import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.INSTAGRAM_APP_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'https://localhost:3000/api/instagram/callback';

  if (!appId) {
    return NextResponse.json({ 
      error: "Veuillez configurer INSTAGRAM_APP_ID et INSTAGRAM_APP_SECRET dans votre .env" 
    }, { status: 400 });
  }

  // Scopes validés pour API Graph v21.0 - Facebook Login for Business
  // L'application Meta de l'utilisateur rejette les scopes "avancés".
  // On demande UNIQUEMENT les trois stricts nécessaires pour publier.
  const scopes = [
    'instagram_content_publish',
    'pages_show_list',
    'pages_read_engagement'
  ].join(',');

  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&display=page&extras={"setup":{"channel":"IG_API_ONBOARDING"}}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}`;

  return NextResponse.redirect(authUrl);
}
