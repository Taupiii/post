import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.INSTAGRAM_APP_ID;
  const configId = process.env.INSTAGRAM_CONFIG_ID; // ID de configuration Facebook Login for Business
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'https://localhost:3000/api/instagram/callback';

  if (!appId) {
    return NextResponse.json({ 
      error: "Veuillez configurer INSTAGRAM_APP_ID et INSTAGRAM_APP_SECRET dans votre .env" 
    }, { status: 400 });
  }

  if (!configId) {
    return NextResponse.json({ 
      error: "Veuillez configurer INSTAGRAM_CONFIG_ID dans votre .env (ID de configuration Facebook Login for Business)" 
    }, { status: 400 });
  }

  // Facebook Login for Business nécessite le config_id dans l'URL OAuth
  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&config_id=${configId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

  return NextResponse.redirect(authUrl);
}
