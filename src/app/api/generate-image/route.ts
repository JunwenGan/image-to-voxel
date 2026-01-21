import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const IMAGE_SYSTEM_PROMPT = 'Generate an isolated object/scene on a simple background.';

export async function POST(request: NextRequest) {
  try {
    const { prompt, aspectRatio = '1:1', optimize = true } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    let finalPrompt = prompt;
    if (optimize) {
      finalPrompt = `${IMAGE_SYSTEM_PROMPT}\n\nSubject: ${prompt}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: finalPrompt }],
      },
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: aspectRatio,
        },
      } as any,
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      const p = part as any;
      if (p.inlineData) {
        const base64ImageBytes = p.inlineData.data;
        const mimeType = p.inlineData.mimeType || 'image/png';
        return NextResponse.json({
          imageUrl: `data:${mimeType};base64,${base64ImageBytes}`,
        });
      }
    }

    return NextResponse.json({ error: 'No image generated' }, { status: 500 });
  } catch (error) {
    console.error('Image generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
