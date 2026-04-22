import { NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { prisma } from '@/lib/prisma';
import { fromZonedTime } from 'date-fns-tz';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

// Utilise ffprobe embarqué si disponible, sinon le ffprobe système
try {
  ffmpeg.setFfprobePath(ffprobeInstaller.path);
} catch {}

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads');

// Formats vidéo qui nécessitent une conversion en MP4
const NEEDS_CONVERSION = ['video/quicktime', 'video/webm', 'video/x-msvideo', 'video/avi'];

function parseJSON(raw: FormDataEntryValue | null): Record<string, string> {
  if (!raw || typeof raw !== 'string') return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function parseParisDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  return fromZonedTime(dateStr, 'Europe/Paris');
}

// Convertit une vidéo en MP4 H.264 avec ffmpeg
function convertToMp4(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',   // Codec vidéo H.264
        '-crf 23',        // Qualité (18=haute, 28=basse) — 23 est le défaut
        '-preset fast',   // Vitesse de conversion
        '-c:a aac',       // Codec audio AAC
        '-b:a 128k',      // Bitrate audio
        '-movflags +faststart', // Optimise pour le streaming web
        '-pix_fmt yuv420p',     // Compatible avec tous les players
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`Conversion ffmpeg échouée: ${err.message}`)))
      .run();
  });
}

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file = data.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
    }

    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 100 Mo)." }, { status: 413 });
    }

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const baseName = `${Date.now()}-${safeName.replace(/\.[^.]+$/, '')}`;
    const originalExt = safeName.split('.').pop()?.toLowerCase() || 'mp4';

    const isVideo = file.type.startsWith('video/');
    const needsConversion = isVideo && NEEDS_CONVERSION.includes(file.type);

    // Sauvegarder le fichier original
    const originalFileName = `${baseName}.${originalExt}`;
    const originalPath = path.join(UPLOAD_DIR, originalFileName);
    await writeFile(originalPath, buffer);

    let mediaUrl: string;
    let finalFileName: string;

    if (needsConversion) {
      // Convertir en MP4
      console.log(`[UPLOAD] Conversion ${file.type} → MP4: ${originalFileName}`);
      finalFileName = `${baseName}.mp4`;
      const mp4Path = path.join(UPLOAD_DIR, finalFileName);

      try {
        await convertToMp4(originalPath, mp4Path);
        // Supprimer le fichier original après conversion réussie
        await unlink(originalPath);
        console.log(`[UPLOAD] Conversion réussie → ${finalFileName}`);
      } catch (convErr) {
        // En cas d'échec ffmpeg, on garde le fichier original
        console.warn(`[UPLOAD] Conversion échouée, on garde l'original:`, convErr);
        finalFileName = originalFileName;
      }
    } else {
      finalFileName = originalFileName;
    }

    mediaUrl = `/uploads/${finalFileName}`;

    const igData = parseJSON(data.get('igData'));
    const ttData = parseJSON(data.get('ttData'));
    const ytData = parseJSON(data.get('ytData'));

    const post = await prisma.post.create({
      data: {
        mediaUrl,
        mediaType: isVideo ? 'video' : 'image',
        igDescription: igData.description || null,
        igDate: parseParisDate(igData.date),
        ttDescription: ttData.description || null,
        ttDate: parseParisDate(ttData.date),
        ytDescription: ytData.description || null,
        ytDate: parseParisDate(ytData.date),
      },
    });

    return NextResponse.json({
      success: true,
      id: post.id,
      converted: needsConversion,
      mediaUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'upload." },
      { status: 500 }
    );
  }
}
