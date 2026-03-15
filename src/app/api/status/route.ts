import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import axios from 'axios';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const auth = cookieStore.get('auth_token');
  if (!auth || auth.value !== 'authenticated') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const status = {
    youtube: { connected: false, label: '' },
    instagram: { connected: false, label: '' },
    tiktok: { connected: false, label: '' },
  };

  // ── YouTube ──
  try {
    const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
    if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
      status.youtube.label = 'Token manquant';
    } else {
      const oauth2 = new google.auth.OAuth2(YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET);
      oauth2.setCredentials({ refresh_token: YOUTUBE_REFRESH_TOKEN });
      const youtube = google.youtube({ version: 'v3', auth: oauth2 });
      const res = await youtube.channels.list({ part: ['snippet'], mine: true });
      const channel = res.data.items?.[0];
      status.youtube.connected = true;
      status.youtube.label = channel?.snippet?.title || 'Connecté';
    }
  } catch {
    status.youtube.label = 'Erreur de connexion';
  }

  // ── Instagram ──
  try {
    const { INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID } = process.env;
    if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_ACCOUNT_ID) {
      status.instagram.label = 'Token manquant';
    } else {
      const res = await axios.get(`https://graph.facebook.com/v19.0/${INSTAGRAM_ACCOUNT_ID}`, {
        params: { fields: 'name,username', access_token: INSTAGRAM_ACCESS_TOKEN },
        timeout: 5000,
      });
      status.instagram.connected = true;
      status.instagram.label = res.data.username || res.data.name || 'Connecté';
    }
  } catch {
    status.instagram.label = 'Erreur de connexion';
  }

  // ── TikTok ──
  try {
    const { TIKTOK_ACCESS_TOKEN } = process.env;
    if (!TIKTOK_ACCESS_TOKEN) {
      status.tiktok.label = 'Token manquant';
    } else {
      const res = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
        headers: { Authorization: `Bearer ${TIKTOK_ACCESS_TOKEN}` },
        params: { fields: 'display_name,username' },
        timeout: 5000,
      });
      const user = res.data?.data?.user;
      status.tiktok.connected = true;
      status.tiktok.label = user?.display_name || user?.username || 'Connecté';
    }
  } catch {
    status.tiktok.label = 'Erreur de connexion';
  }

  return NextResponse.json(status);
}
