import { NextResponse } from 'next/server';
import { sendFailureAlert } from '@/lib/email';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (secret !== (process.env.CRON_SECRET || 'kwikwiii-cron-secret')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    await sendFailureAlert('ig', 'test-post-id', 'Ceci est un email de test envoyé depuis Kwikwiii Automator.');
    return NextResponse.json({ success: true, message: 'Email de test envoyé ! Vérifiez votre boîte mail.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
