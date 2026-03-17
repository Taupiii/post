import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.INSTAGRAM_APP_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'https://localhost:3000/api/instagram/callback';

  if (!appId) {
    return NextResponse.json({ 
      error: "Veuillez configurer INSTAGRAM_APP_ID et INSTAGRAM_APP_SECRET dans votre .env" 
    }, { status: 400 });
  }

  // Scopes pour "Instagram API with Instagram Login"
  const scopes = [
    'instagram_business_basic',
    'instagram_business_content_publish',
    'instagram_business_manage_messages'
  ].join(',');

  // Endpoint Instagram Login (pas Facebook Login — requis pour le cas d'utilisation "Instagram")
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}`;

  return NextResponse.redirect(authUrl);
}
