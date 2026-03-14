import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { prisma } from '@/lib/prisma';
import { toZonedTime } from 'date-fns-tz';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads');

function parseJSON(raw: FormDataEntryValue | null): Record<string, string> {
  if (!raw || typeof raw !== 'string') return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function parseParisDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // `dateStr` is typically "YYYY-MM-DDTHH:mm".
  // `toZonedTime` will treat the local string as if it was in the specified timezone
  // and convert it to a proper global Date object.
  return toZonedTime(dateStr, 'Europe/Paris');
}

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file = data.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
    }

    // Validate size (100 MB)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 100 Mo)." }, { status: 413 });
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}-${safeName}`;
    const uploadPath = path.join(UPLOAD_DIR, fileName);

    await writeFile(uploadPath, buffer);

    const mediaUrl = `/uploads/${fileName}`;
    const igData = parseJSON(data.get('igData'));
    const ttData = parseJSON(data.get('ttData'));
    const ytData = parseJSON(data.get('ytData'));

    const post = await prisma.post.create({
      data: {
        mediaUrl,
        mediaType: file.type.startsWith('image/') ? 'image' : 'video',
        igDescription: igData.description || null,
        igDate: parseParisDate(igData.date),
        ttDescription: ttData.description || null,
        ttDate: parseParisDate(ttData.date),
        ytDescription: ytData.description || null,
        ytDate: parseParisDate(ytData.date),
      },
    });

    return NextResponse.json({ success: true, id: post.id });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'upload." },
      { status: 500 }
    );
  }
}
