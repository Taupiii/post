import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { toZonedTime } from 'date-fns-tz';

function parseParisDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  return toZonedTime(dateStr, 'Europe/Paris');
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const auth = cookieStore.get('auth_token');
    
    if (!auth || auth.value !== 'authenticated') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    
    // Convert strings back to properly zoned dates if they are provided
    const dataToUpdate: any = { ...body };
    if (dataToUpdate.igDate !== undefined) dataToUpdate.igDate = parseParisDate(dataToUpdate.igDate);
    if (dataToUpdate.ttDate !== undefined) dataToUpdate.ttDate = parseParisDate(dataToUpdate.ttDate);
    if (dataToUpdate.ytDate !== undefined) dataToUpdate.ytDate = parseParisDate(dataToUpdate.ytDate);

    const post = await prisma.post.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error("Erreur de mise à jour:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const auth = cookieStore.get('auth_token');
    
    if (!auth || auth.value !== 'authenticated') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await prisma.post.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur de suppression:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
