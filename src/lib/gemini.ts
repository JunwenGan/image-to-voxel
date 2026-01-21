// Client-side functions that call our secure API routes
// The API key is stored server-side only

export const VOXEL_PROMPT =
  'I have provided an image. Code a beautiful voxel art scene inspired by this image. Write threejs code as a single-page HTML file. Use InstancedMesh for performance. Include ambient lighting, shadows, and optionally subtle animations like floating or rotating. Make it visually stunning.';

export const generateImage = async (
  prompt: string,
  aspectRatio: string = '1:1',
  optimize: boolean = true
): Promise<string> => {
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, aspectRatio, optimize }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate image');
  }

  return data.imageUrl;
};

export const generateVoxelScene = async (
  imageBase64: string,
  onThoughtUpdate?: (thought: string) => void
): Promise<string> => {
  // Show progress while waiting
  if (onThoughtUpdate) {
    onThoughtUpdate('Generating voxel scene code...');
  }

  const response = await fetch('/api/generate-voxel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageBase64 }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate voxel scene');
  }

  return data.html;
};
