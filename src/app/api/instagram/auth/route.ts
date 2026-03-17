import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.INSTAGRAM_APP_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'https://localhost:3000/api/instagram/callback';

  if (!appId) {
    return NextResponse.json({ 
      error: "Veuillez configurer INSTAGRAM_APP_ID et INSTAGRAM_APP_SECRET dans votre .env" 
    }, { status: 400 });
  }

  // Scopes pour "Facebook Login for Business" avec la variante "API Graph pour Instagram"
  // Ces scopes sont activés une fois la configuration FB Login for Business créée dans le portail Meta.
  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_show_list',
    'pages_read_engagement'
  ].join(',');

  // Utilise le dialog Facebook (pas api.instagram.com) car la config est "Facebook Login for Business"
  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}`;

  return NextResponse.redirect(authUrl);
}
