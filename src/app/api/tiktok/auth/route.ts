import { NextResponse } from 'next/server';

export async function GET() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || 'https://localhost:3000/api/tiktok/callback'; 

  if (!clientKey) {
    return NextResponse.json({ 
      error: "Veuillez configurer TIKTOK_CLIENT_KEY et TIKTOK_CLIENT_SECRET dans votre .env" 
    }, { status: 400 });
  }

  // Scopes for TikTok Video Publishing API
  // Le produit 'Login Kit Web' fournit 'user.info.profile'
  const scopes = 'user.info.profile,video.upload,video.publish';
  const state = Math.random().toString(36).substring(7); // Basic CSRF protection

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&response_type=code&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return NextResponse.redirect(authUrl);
}
