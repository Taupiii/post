import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeminiResult {
  instagram: string;
  tiktok: string;
  youtube: string;
}

function extractJSON(raw: string): GeminiResult {
  // Strip markdown fences if present
  const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  // Validate shape
  if (typeof parsed.instagram !== 'string' || typeof parsed.tiktok !== 'string' || typeof parsed.youtube !== 'string') {
    throw new Error('Format de réponse invalide');
  }
  return parsed as GeminiResult;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const baseDescription = typeof body.baseDescription === 'string' ? body.baseDescription.trim() : '';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé API Gemini non configurée. Ajoutez GEMINI_API_KEY dans .env' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.9,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `Tu es un expert en marketing sur les réseaux sociaux.
Voici le sujet ou la description de base d'un contenu vidéo/photo : "${baseDescription || 'Nouvelle publication'}"

Écris 3 descriptions DIFFÉRENTES optimisées pour maximiser le reach sur chaque plateforme :
- Instagram : utilise des emojis, hashtags populaires, et une accroche engageante. 2200 caractères max.
- TikTok : très court, hook fort en première ligne, hashtags natifs (#pourtoi #fyp). 150 caractères max.
- YouTube Shorts : titre accrocheur + description avec mots-clés SEO. 500 caractères max.

Réponds UNIQUEMENT avec ce JSON :
{"instagram":"...","tiktok":"...","youtube":"..."}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJSON(text);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Gemini Error:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json(
      { error: `Erreur Gemini : ${message}` },
      { status: 500 }
    );
  }
}
