import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const IMAGE_SYSTEM_PROMPT = 'Generate an isolated object/scene on a simple background.';

export async function POST(request: NextRequest) {
  try {
    const { prompt, aspectRatio = '1:1', optimize = true } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    let finalPrompt = prompt;
    if (optimize) {
      finalPrompt = `${IMAGE_SYSTEM_PROMPT}\n\nSubject: ${prompt}`;
    }

    const size =
      aspectRatio === '16:9'
        ? '1536x1024'
        : aspectRatio === '9:16'
          ? '1024x1536'
          : '1024x1024';

    const response = await openai.images.generate({
      model: 'gpt-image-1-mini',
      prompt: finalPrompt,
      size,
    });

    const image = response.data?.[0];
    const base64ImageBytes = image?.b64_json;
    if (base64ImageBytes) {
      return NextResponse.json({
        imageUrl: `data:image/png;base64,${base64ImageBytes}`,
      });
    }

    const imageUrl = image?.url;
    if (imageUrl) {
      return NextResponse.json({ imageUrl });
    }

    return NextResponse.json({ error: 'No image generated' }, { status: 500 });
  } catch (error) {
    console.error('Image generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
