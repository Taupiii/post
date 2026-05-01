import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { sendFailureAlert } from '@/lib/email';

type Platform = 'ig' | 'tt' | 'yt';

const MAX_RETRIES = 3;

const PLATFORM_FIELDS: Record<Platform, { date: string; published: string; description: string; retries: string }> = {
  ig: { date: 'igDate', published: 'igPublished', description: 'igDescription', retries: 'igRetries' },
  tt: { date: 'ttDate', published: 'ttPublished', description: 'ttDescription', retries: 'ttRetries' },
  yt: { date: 'ytDate', published: 'ytPublished', description: 'ytDescription', retries: 'ytRetries' },
};

async function publishToTikTok(post: any) {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  
  if (!token) {
    throw new Error("Identifiant TikTok (Access Token) manquant dans .env");
  }

  // TikTok Direct Post API requires the video file to be accessible via a public URL, 
  // similar to Instagram Meta Graph.
  const baseUrl = process.env.PUBLIC_URL || 'https://postrs.kwikwiii.online';
  const mediaPublicUrl = `${baseUrl}${post.mediaUrl}`;
  console.log(`[TIKTOK] URL vidéo: ${mediaPublicUrl}`);

  if (post.mediaType !== 'video') {
    throw new Error("L'API vidéo TikTok n'accepte que les vidéos (pas les photos).");
  }

  const endpoint = `https://open.tiktokapis.com/v2/post/publish/video/init/`;
  
  // Dans la version basique, on utilise pull_from_url
  const body = {
    post_info: {
      title: (post.ttDescription || 'Vidéo Kwikwiii').slice(0, 150),
      privacy_level: 'SELF_ONLY', // Valeurs valides: PUBLIC_TO_EVERYONE, MUTUAL_FOLLOW_FRIENDS, FOLLOWER_OF_CREATOR, SELF_ONLY
      disable_comment: false,
      disable_duet: false,
      disable_stitch: false,
      video_cover_timestamp_ms: 1000,
    },
    source_info: {
      source: 'PULL_FROM_URL',
      video_url: mediaPublicUrl,
    }
  };

  const res = await axios.post(endpoint, body, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (res.data.error && res.data.error.code !== 'ok') {
    throw new Error(`Erreur TikTok: ${res.data.error.message}`);
  }
}

async function publishToInstagram(post: any) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;

  if (!token || !igAccountId) {
    throw new Error("Identifiants Instagram (Token ou Account ID) manquants dans .env");
  }

  // Instagram Graph API requires URLs for media, so we need the public absolute URL.
  // In development (localhost), Instagram servers cannot access files on your local machine.
  // For this mock/demo, we assume the server is accessible publicly via an env variable,
  // or we fallback to a placeholder public image just to prove the API call works in dev.
  const baseUrl = process.env.PUBLIC_URL || 'https://postrs.kwikwiii.online';
  const mediaPublicUrl = `${baseUrl}${post.mediaUrl}`;
  console.log(`[INSTAGRAM] URL média: ${mediaPublicUrl}`);

  // 1. Create Media Container
  const createUrl = `https://graph.facebook.com/v19.0/${igAccountId}/media`;
  const containerRes = await axios.post(createUrl, null, {
    params: {
      access_token: token,
      caption: post.igDescription || '',
      // Si c'est une vidéo, on doit passer media_type='REELS' et video_url
      ...(post.mediaType === 'video'
        ? { media_type: 'REELS', video_url: mediaPublicUrl }
        : { image_url: mediaPublicUrl }),
    },
  });

  const creationId = containerRes.data.id;

  // Pour les vidéos (Reels), Meta doit d'abord traiter la vidéo avant qu'on puisse la publier.
  // On fait du polling sur le statut jusqu'à ce que ce soit FINISHED (max 60s)
  if (post.mediaType === 'video') {
    const statusUrl = `https://graph.facebook.com/v19.0/${creationId}`;
    let status = '';
    let attempts = 0;
    while (status !== 'FINISHED' && attempts < 12) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const statusRes = await axios.get(statusUrl, {
        params: { fields: 'status_code,video_status,error_message,error_code', access_token: token }
      });
      const rawData = statusRes.data;
      status = rawData.status_code;
      const videoStatus = rawData.video_status;
      const errorMessage = rawData.error_message;
      const errorCode = rawData.error_code;
      console.log(`[INSTAGRAM] Statut conteneur (tentative ${attempts + 1}): status_code=${status} | video_status=${videoStatus ?? 'n/a'} | error_message=${errorMessage ?? 'n/a'} | error_code=${errorCode ?? 'n/a'}`);
      if (status === 'ERROR') {
        console.error('[INSTAGRAM] Réponse complète Meta au rejet:', JSON.stringify(rawData, null, 2));
        const detail = [errorMessage, videoStatus, errorCode ? `code ${errorCode}` : ''].filter(Boolean).join(' / ');
        throw new Error(`Meta a rejeté la vidéo: ${detail || 'raison inconnue'}`);
      }
      attempts++;
    }
    if (status !== 'FINISHED') throw new Error('Timeout : Meta n\'a pas traité la vidéo à temps (60s).');
  }

  // 2. Publish the Container
  const publishUrl = `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`;
  await axios.post(publishUrl, null, {
    params: {
      access_token: token,
      creation_id: creationId,
    },
  });
}

async function publishToYouTube(post: any) {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Identifiants YouTube manquants dans .env");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  const filePath = path.join(process.cwd(), 'public', post.mediaUrl);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable sur le disque : ${filePath}`);
  }

  // Le titre YouTube est obligatoire et limité à 100 caractères max
  const titleLine = post.ytDescription.split('\n')[0].trim();
  const title = titleLine.substring(0, 95) || 'Vidéo Kwikwiii';

  await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title,
        description: post.ytDescription,
        categoryId: '22', // Catégorie "People & Blogs" par défaut
      },
      status: {
        privacyStatus: 'public', // Public — la vidéo sera visible immédiatement
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(filePath),
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    if (secret !== (process.env.CRON_SECRET || 'kwikwiii-cron-secret')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const now = new Date();
    const results: Record<Platform, number> = { ig: 0, tt: 0, yt: 0 };

    for (const [platform, fields] of Object.entries(PLATFORM_FIELDS) as [Platform, typeof PLATFORM_FIELDS[Platform]][]) {
      // Find posts due for this platform (excluding posts that hit max retries)
      const duePosts = await prisma.post.findMany({
        where: {
          [fields.date]:      { lte: now },
          [fields.published]: false,
          [fields.description]: { not: null },
          [fields.retries]:   { lt: MAX_RETRIES },
        },
        select: { id: true, [fields.description]: true, mediaUrl: true, mediaType: true, [fields.retries]: true },
      });

      if (duePosts.length === 0) continue;

      const successfulIds: string[] = [];

      for (const post of duePosts) {
        const currentRetries: number = (post as any)[fields.retries] ?? 0;
        console.log(`[PUBLISH] Tentative ${platform.toUpperCase()} — post ${post.id} (essai ${currentRetries + 1}/${MAX_RETRIES})`);
        try {
          if (platform === 'yt') {
            await publishToYouTube(post);
            console.log(`[PUBLISH] Succès YT: ${post.id}`);
          } else if (platform === 'ig') {
            await publishToInstagram(post);
            console.log(`[PUBLISH] Succès IG: ${post.id}`);
          } else if (platform === 'tt') {
            await publishToTikTok(post);
            console.log(`[PUBLISH] Succès TT: ${post.id}`);
          }
          successfulIds.push(post.id);
        } catch (err: any) {
          const apiData = err.response?.data;
          const errMsg = apiData?.error?.message || apiData?.message || err.message || 'Erreur inconnue';
          const errCode = apiData?.error?.code || apiData?.error?.type || apiData?.error?.error_code || '';
          console.error(`[PUBLISH ERR] ${platform.toUpperCase()} post ${post.id}:`);
          console.error(`  → Message: ${errMsg}`);
          if (errCode) console.error(`  → Code: ${errCode}`);
          if (apiData)  console.error(`  → API Response:`, JSON.stringify(apiData, null, 2));

          const newRetries = currentRetries + 1;
          // Incrémenter le compteur d'échecs
          await prisma.post.update({
            where: { id: post.id },
            data: { [fields.retries]: newRetries },
          });

          // Envoyer l'email UNIQUEMENT à la première tentative
          if (currentRetries === 0) {
            await sendFailureAlert(platform, post.id, {
              message: errMsg,
              code: errCode || undefined,
              apiResponse: apiData || undefined,
            }).catch(e => console.error('[EMAIL ERR]', e.message));
            console.log(`[PUBLISH] Email d'alerte envoyé (1ère erreur). Plus d'emails pour ce post sur ${platform.toUpperCase()}.`);
          } else {
            console.log(`[PUBLISH] Échec silencieux (tentative ${newRetries}/${MAX_RETRIES}) — pas d'email.`);
          }

          if (newRetries >= MAX_RETRIES) {
            console.error(`[PUBLISH] Post ${post.id} abandonné après ${MAX_RETRIES} tentatives sur ${platform.toUpperCase()}.`);
          }
        }
      }

      // Batch-update only successful posts
      if (successfulIds.length > 0) {
        await prisma.post.updateMany({
          where: { id: { in: successfulIds } },
          data: { [fields.published]: true },
        });
        results[platform] = successfulIds.length;
      }
    }

    return NextResponse.json({ success: true, published: results });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
