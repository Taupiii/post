import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get('auth_token');
    
    if (!auth || auth.value !== 'authenticated') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    console.error("Erreur lors de la récupération des posts:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
