import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const VOXEL_PROMPT =
  'I have provided an image. Code a beautiful voxel art scene inspired by this image. Write threejs code as a single-page HTML file. Use InstancedMesh for performance. Include ambient lighting, shadows, and optionally subtle animations like floating or rotating. Make it visually stunning.';

function extractHtmlFromText(text: string): string {
  if (!text) return '';

  // Try to extract from markdown code blocks first
  const codeBlockMatch = text.match(/```(?:html)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find a complete HTML document structure
  const htmlMatch = text.match(/(<!DOCTYPE html>|<html)[\s\S]*<\/html>/i);
  if (htmlMatch) {
    return htmlMatch[0];
  }

  // Check if the text itself starts with HTML-like content
  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    return text.trim();
  }

  return text.trim();
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Extract the base64 data part if it includes the prefix
    const base64Data = imageBase64.split(',')[1] || imageBase64;

    // Extract MIME type from the data URL if present
    const mimeMatch = imageBase64.match(/^data:(.*?);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    let fullHtml = '';

    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: VOXEL_PROMPT,
          },
        ],
      },
    });

    for await (const chunk of response) {
      const candidates = chunk.candidates;
      if (candidates?.[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
          const p = part as any;
          if (p.text) {
            fullHtml += p.text;
          }
        }
      }
    }

    const extractedHtml = extractHtmlFromText(fullHtml);

    return NextResponse.json({ html: extractedHtml });
  } catch (error) {
    console.error('Voxel generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
