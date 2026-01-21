import { GoogleGenAI } from '@google/genai';
import { extractHtmlFromText } from './html';

const getAI = () => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('Please set your Gemini API key in .env.local');
  }
  return new GoogleGenAI({ apiKey });
};

export const IMAGE_SYSTEM_PROMPT =
  'Generate an isolated object/scene on a simple background.';

export const VOXEL_PROMPT =
  'I have provided an image. Code a beautiful voxel art scene inspired by this image. Write threejs code as a single-page HTML file. Use InstancedMesh for performance. Include ambient lighting, shadows, and optionally subtle animations like floating or rotating. Make it visually stunning.';

export const generateImage = async (
  prompt: string,
  aspectRatio: string = '1:1',
  optimize: boolean = true
): Promise<string> => {
  const ai = getAI();

  let finalPrompt = prompt;
  if (optimize) {
    finalPrompt = `${IMAGE_SYSTEM_PROMPT}\n\nSubject: ${prompt}`;
  }

  const modelsToTry = ['gemini-2.5-flash-image'];
  let lastError: unknown = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
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
          return `data:${mimeType};base64,${base64ImageBytes}`;
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error('No image generated. Please try uploading an image instead.');
};

export const generateVoxelScene = async (
  imageBase64: string,
  onThoughtUpdate?: (thought: string) => void
): Promise<string> => {
  const ai = getAI();

  // Extract the base64 data part if it includes the prefix
  const base64Data = imageBase64.split(',')[1] || imageBase64;

  // Extract MIME type from the data URL if present
  const mimeMatch = imageBase64.match(/^data:(.*?);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  let fullHtml = '';

  // Using gemini-3-flash-preview
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
          // Update progress with a simple message
          if (onThoughtUpdate && fullHtml.length > 0) {
            onThoughtUpdate('Generating voxel scene code...');
          }
        }
      }
    }
  }

  return extractHtmlFromText(fullHtml);
};
