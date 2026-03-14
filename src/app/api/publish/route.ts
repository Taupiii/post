import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

type Platform = 'ig' | 'tt' | 'yt';

const PLATFORM_FIELDS: Record<Platform, { date: string; published: string; description: string }> = {
  ig: { date: 'igDate', published: 'igPublished', description: 'igDescription' },
  tt: { date: 'ttDate', published: 'ttPublished', description: 'ttDescription' },
  yt: { date: 'ytDate', published: 'ytPublished', description: 'ytDescription' },
};

async function publishToTikTok(post: any) {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  
  if (!token) {
    throw new Error("Identifiant TikTok (Access Token) manquant dans .env");
  }

  // TikTok Direct Post API requires the video file to be accessible via a public URL, 
  // similar to Instagram Meta Graph.
  const baseUrl = process.env.PUBLIC_URL || 'https://kwikwiii-demo.vercel.app';
  const mediaPublicUrl = `${baseUrl}${post.mediaUrl}`;

  if (post.mediaType !== 'video') {
    throw new Error("L'API vidéo TikTok n'accepte que les vidéos (pas les photos).");
  }

  const endpoint = `https://open.tiktokapis.com/v2/post/publish/video/init/`;
  
  // Dans la version basique, on utilise pull_from_url
  const body = {
    post_info: {
      title: post.ttDescription || 'Vidéo Kwikwiii',
      privacy_level: 'PRIVATE', // Private en dev pour éviter la pollution
      disable_comment: false,
      disable_duet: false,
      disable_stitch: false
    },
    source_info: {
      source: 'PULL_FROM_URL',
      video_url: mediaPublicUrl
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
  const baseUrl = process.env.PUBLIC_URL || 'https://kwikwiii-demo.vercel.app';
  const mediaPublicUrl = `${baseUrl}${post.mediaUrl}`;

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

  // Si c'est une vidéo longue (Reels), Meta prend du temps à la traiter.
  // En production absolue, il faut faire du polling sur le statut.
  // Ici on fait une pause basique de 5 secondes pour laisser Meta ingest la vidéo.
  if (post.mediaType === 'video') {
    await new Promise(resolve => setTimeout(resolve, 5000));
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
        privacyStatus: 'private', // On le met en privé pour éviter les accidents en dev. Mettre 'public' plus tard.
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
      // Find posts due for this platform
      const duePosts = await prisma.post.findMany({
        where: {
          [fields.date]:      { lte: now },
          [fields.published]: false,
          [fields.description]: { not: null },
        },
        select: { id: true, [fields.description]: true, mediaUrl: true },
      });

      if (duePosts.length === 0) continue;

      const successfulIds: string[] = [];

      for (const post of duePosts) {
        console.log(`[PUBLISH] Tentative ${platform.toUpperCase()} — post ${post.id}`);
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
          console.error(`[PUBLISH ERR] ${platform.toUpperCase()} post ${post.id}:`, err.response?.data || err.message);
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
