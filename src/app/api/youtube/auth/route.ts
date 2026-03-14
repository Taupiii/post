import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/youtube/callback';

  if (!clientId || !clientSecret) {
    return NextResponse.json({ 
      error: "Veuillez configurer YOUTUBE_CLIENT_ID et YOUTUBE_CLIENT_SECRET dans votre .env" 
    }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Nécessaire pour obtenir un refresh_token
    scope: ['https://www.googleapis.com/auth/youtube.upload'],
    prompt: 'consent' // Force l'écran de consentement pour être sûr d'avoir le refresh_token
  });

  return NextResponse.redirect(url);
}
