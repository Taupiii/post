import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.INSTAGRAM_APP_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'https://localhost:3000/api/instagram/callback'; // Meta API generally requires HTTPS even for localhost

  if (!appId) {
    return NextResponse.json({ 
      error: "Veuillez configurer INSTAGRAM_APP_ID et INSTAGRAM_APP_SECRET dans votre .env" 
    }, { status: 400 });
  }

  // Permissions pour "Instagram API with Instagram Login" (nouveau système Meta 2024+)
  const scopes = [
    'instagram_business_basic',
    'instagram_business_content_publish',
    'instagram_business_manage_messages'
  ].join(',');

  // Nouveau endpoint d'authentification Instagram (pas Facebook)
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}`;

  return NextResponse.redirect(authUrl);
}
