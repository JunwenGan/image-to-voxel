'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { generateImage, generateVoxelScene, VOXEL_PROMPT } from '@/lib/gemini';
import { processGeneratedHtml } from '@/lib/html';
import { AppStatus, ViewMode, Example, UserContent } from '@/types';

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
];

const SAMPLE_PROMPTS = [
  'A treehouse under the sea',
  'A cyberpunk street food stall',
  'An ancient temple floating in the sky',
  'A cozy winter cabin with smoke',
  'A futuristic mars rover',
  'A dragon guarding gold',
];

const ASPECT_RATIOS = ['1:1', '3:4', '4:3', '16:9', '9:16'];

// Example scenes with preview colors
const EXAMPLES: Example[] = [
  {
    img: '/examples/example1.png',
    html: '/examples/example1.html',
    title: 'Sakura Island',
    color: '#FFB7C5', // sakura pink
  },
  {
    img: '/examples/example2.png',
    html: '/examples/example2.html',
    title: 'Crystal Cave',
    color: '#7B68EE', // crystal purple
  },
  {
    img: '/examples/example3.png',
    html: '/examples/example3.html',
    title: 'Cyber City',
    color: '#00CED1', // cyber teal
  },
];

export default function Home() {
  // Input State
  const [prompt, setPrompt] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [useOptimization, setUseOptimization] = useState(true);

  // Content State
  const [imageData, setImageData] = useState<string | null>(null);
  const [voxelCode, setVoxelCode] = useState<string | null>(null);
  const [userContent, setUserContent] = useState<UserContent | null>(null);

  // UI State
  const [selectedTile, setSelectedTile] = useState<number | 'user' | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [status, setStatus] = useState<AppStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('image');
  const [thinkingText, setThinkingText] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isViewerVisible, setIsViewerVisible] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate placeholder prompts
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SAMPLE_PROMPTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleError = useCallback((err: Error) => {
    setStatus('error');
    setErrorMsg(err.message || 'An unexpected error occurred.');
    console.error(err);
  }, []);

  const handleImageGenerate = async () => {
    if (!prompt.trim()) return;

    setStatus('generating_image');
    setErrorMsg('');
    setImageData(null);
    setVoxelCode(null);
    setThinkingText(null);
    setViewMode('image');
    setIsViewerVisible(true);

    try {
      const imageUrl = await generateImage(prompt, aspectRatio, useOptimization);

      const newUserContent: UserContent = {
        image: imageUrl,
        voxel: null,
        prompt: prompt,
      };
      setUserContent(newUserContent);
      setImageData(imageUrl);
      setVoxelCode(null);
      setSelectedTile('user');
      setStatus('idle');
      setShowGenerator(false);
    } catch (err) {
      handleError(err as Error);
    }
  };

  const processFile = useCallback((file: File) => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      handleError(new Error('Invalid file type. Please upload PNG, JPEG, WEBP, HEIC, or HEIF.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;

      const newUserContent: UserContent = {
        image: result,
        voxel: null,
        prompt: '',
      };
      setUserContent(newUserContent);
      setImageData(result);
      setVoxelCode(null);
      setViewMode('image');
      setStatus('idle');
      setErrorMsg('');
      setSelectedTile('user');
      setShowGenerator(false);
      setIsViewerVisible(true);
    };
    reader.onerror = () => handleError(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  }, [handleError]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Load example - just load the HTML, no image needed
  const handleExampleClick = async (example: Example, index: number) => {
    if (status !== 'idle' && status !== 'error') return;

    setSelectedTile(index);
    setShowGenerator(false);
    setErrorMsg('');
    setThinkingText(null);
    setIsViewerVisible(true);

    try {
      // Fetch example HTML and preview image
      const htmlResponse = await fetch(example.html);
      if (!htmlResponse.ok) {
        throw new Error('Failed to load example');
      }
      const htmlText = processGeneratedHtml(await htmlResponse.text());

      let exampleImage: string | null = null;
      if (example.img) {
        const imageResponse = await fetch(example.img);
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          exampleImage = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read example image'));
            reader.readAsDataURL(imageBlob);
          });
        }
      }

      setImageData(exampleImage);
      setVoxelCode(htmlText);
      setViewMode('voxel');
      setStatus('idle');
    } catch (err) {
      handleError(err as Error);
    }
  };

  const handleUserTileClick = () => {
    if (status !== 'idle' && status !== 'error') return;

    if (selectedTile === 'user') {
      const willShow = !showGenerator;
      setShowGenerator(willShow);
      setIsViewerVisible(!willShow || !!userContent);

      if (!willShow && !userContent) {
        setSelectedTile(null);
      }
    } else {
      setSelectedTile('user');
      setShowGenerator(true);
      setIsViewerVisible(false);

      if (userContent) {
        setImageData(userContent.image);
        setVoxelCode(userContent.voxel);
        setViewMode(userContent.voxel ? 'voxel' : 'image');
      } else {
        setImageData(null);
        setVoxelCode(null);
        setViewMode('image');
      }
    }
  };

  const handleVoxelize = async () => {
    if (!imageData) return;

    setStatus('generating_voxels');
    setErrorMsg('');
    setThinkingText(null);
    setIsViewerVisible(true);

    try {
      const codeRaw = await generateVoxelScene(imageData, (thought) => {
        setThinkingText(thought);
      });

      const code = processGeneratedHtml(codeRaw);
      console.log('Processed HTML preview:', code.substring(0, 500));
      console.log('Full HTML length:', code.length);
      setVoxelCode(code);

      if (selectedTile === 'user') {
        setUserContent((prev) => (prev ? { ...prev, voxel: code } : null));
      }

      setViewMode('voxel');
      setStatus('idle');
      setThinkingText(null);
    } catch (err) {
      handleError(err as Error);
    }
  };

  const handleDownload = () => {
    if (viewMode === 'image' && imageData) {
      const a = document.createElement('a');
      a.href = imageData;
      const ext = imageData.includes('image/jpeg') ? 'jpg' : 'png';
      a.download = `voxelize-image-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (viewMode === 'voxel' && voxelCode) {
      const a = document.createElement('a');
      a.href = `data:text/html;charset=utf-8,${encodeURIComponent(voxelCode)}`;
      a.download = `voxel-scene-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const isLoading = status !== 'idle' && status !== 'error';

  return (
    <div className="min-h-screen flex flex-col items-center py-6 px-3 sm:py-8 sm:px-4 font-sans bg-white">
      <style jsx>{`
        .loading-dots::after {
          content: '';
          animation: dots 2s steps(4, end) infinite;
        }
        @keyframes dots {
          0%, 20% { content: ''; }
          40% { content: '.'; }
          60% { content: '..'; }
          80% { content: '...'; }
        }
      `}</style>

      <div className="w-full max-w-lg space-y-5">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4">
          <h1 className="text-2xl sm:text-3xl font-black leading-[0.9] tracking-tight">
            IMAGE TO VOXEL ART
          </h1>
          <p className="mt-1.5 text-sm text-gray-600 font-medium">
            Create voxel art scenes inspired by any image, with Gemini AI.
          </p>
        </div>

        {/* Tile Gallery */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full">
          {EXAMPLES.map((ex, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleExampleClick(ex, idx)}
              disabled={isLoading}
              aria-label={`Load ${ex.title}`}
              className={`aspect-square relative overflow-hidden group focus:outline-none disabled:opacity-50 cursor-pointer bg-gray-100 transition-all duration-200
                border-2 border-black text-[10px] sm:text-xs
                active:translate-y-0 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]
                ${selectedTile === idx
                  ? 'scale-[1.02] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5'
                  : 'hover:border-gray-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}
              `}
            >
              {ex.img ? (
                <img src={ex.img} alt={ex.title} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white uppercase font-bold p-1 text-center leading-tight text-shadow"
                  style={{ backgroundColor: ex.color || '#888', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {ex.title}
                </div>
              )}
            </button>
          ))}

          {/* User Generate Tile */}
          <button
            type="button"
            onClick={handleUserTileClick}
            disabled={isLoading}
            aria-label="Generate new scene"
            className={`aspect-square flex flex-col items-center justify-center transition-all duration-200 focus:outline-none disabled:opacity-50 group overflow-hidden relative border-2 border-black
              active:translate-y-0 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]
              ${selectedTile === 'user' ? 'scale-[1.02] -translate-y-0.5' : 'hover:border-gray-600 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}
              ${!userContent && !showGenerator ? 'bg-white text-black hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'}
              ${showGenerator && selectedTile === 'user'
                ? 'bg-black text-white shadow-[2px_2px_0px_0px_#888]'
                : selectedTile === 'user' ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}
            `}
          >
            {userContent ? (
              <>
                <img src={userContent.image} alt="My Generation" className="w-full h-full object-cover" />
                {selectedTile !== 'user' && (
                  <div className="absolute inset-0 bg-transparent shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.12)] flex items-center justify-center transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8 text-white drop-shadow-md">
                      <path strokeLinecap="square" strokeLinejoin="miter" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                )}
                {selectedTile === 'user' && showGenerator && (
                  <div className="absolute inset-0 bg-transparent shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.18)] flex items-center justify-center">
                    <span className="text-white font-bold uppercase text-xs">Editing</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-7 h-7 transition-transform duration-300 ${showGenerator ? 'rotate-45' : 'group-hover:scale-110'}`}>
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="text-[10px] font-bold uppercase mt-1">{showGenerator ? 'Close' : 'Create'}</span>
              </>
            )}
          </button>
        </div>

        {/* Generator Panel */}
        {showGenerator && (
          <div className="space-y-4 animate-in slide-in-from-top-4 fade-in duration-300 border-2 border-black p-4 bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative z-10">
            {/* Upload Section */}
            <div className="w-full">
              <label className="block text-xs font-bold mb-1.5 uppercase">Upload Image</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-28 border-2 border-dashed border-black flex flex-col items-center justify-center cursor-pointer transition-colors
                  ${isDragging ? 'bg-gray-200' : 'bg-white hover:bg-gray-50'}
                `}
              >
                <input
                  type="file"
                  accept={ALLOWED_MIME_TYPES.join(',')}
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-gray-400 mb-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="font-bold uppercase text-xs text-gray-600">Drag and drop or click to upload</p>
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center w-full">
              <div className="border-t-2 border-gray-200 w-full absolute" />
              <span className="bg-gray-50 px-2 text-[10px] font-bold text-gray-400 uppercase relative z-10">OR</span>
            </div>

            {/* AI Generation */}
            <div className="w-full">
              <label htmlFor="prompt" className="block text-xs font-bold mb-1.5 uppercase">
                Generate with AI
              </label>
              <div className="flex gap-2">
                <input
                  id="prompt"
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={SAMPLE_PROMPTS[placeholderIndex]}
                  className="flex-1 px-2 border-2 border-black focus:outline-none focus:ring-0 rounded-none text-sm placeholder-gray-400 bg-white h-9"
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === 'Enter' && handleImageGenerate()}
                />
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  disabled={isLoading}
                  className="w-16 px-1 border-2 border-black focus:outline-none rounded-none bg-white h-9 text-xs"
                >
                  {ASPECT_RATIOS.map((ratio) => (
                    <option key={ratio} value={ratio}>{ratio}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleImageGenerate}
                  disabled={isLoading || !prompt.trim()}
                  className="px-4 h-9 bg-black text-white border-2 border-black font-bold uppercase hover:bg-gray-900 disabled:opacity-50 transition-all text-xs whitespace-nowrap"
                >
                  {status === 'generating_image' ? '...' : 'Go'}
                </button>
              </div>
              {/* Optimize toggle */}
              <label className="flex items-center mt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useOptimization}
                  onChange={(e) => setUseOptimization(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 border-2 border-black rounded-none accent-black"
                />
                <span className="ml-2 text-[10px] font-bold uppercase text-gray-600">
                  Optimize prompt for voxel art
                </span>
              </label>
            </div>
          </div>
        )}


        {/* Error Message */}
        {errorMsg && (
          <div className="p-3 border-2 border-red-500 bg-red-50 text-red-700 text-xs font-bold animate-in fade-in" role="alert">
            ERROR: {errorMsg}
          </div>
        )}

        {/* Viewer Section */}
        {isViewerVisible && (
          <div className="space-y-2">
            <div className="w-full aspect-square border-2 border-black relative bg-gray-50 flex items-center justify-center overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center p-5 overflow-hidden">
                  <div className="w-full text-center mb-4">
                    <div className="text-base font-bold tracking-tight mb-2">
                      {status === 'generating_image'
                        ? 'Generating image with AI'
                        : 'Generating Three.js voxel scene'}
                    </div>
                    {status === 'generating_voxels' && imageData && (
                      <img src={imageData} alt="Source" className="inline-block h-16 w-auto border border-gray-300" />
                    )}
                  </div>

                  <div className="w-full text-center opacity-70 font-mono text-xs">
                    {thinkingText ? (
                      <span>{thinkingText}<span className="loading-dots" /></span>
                    ) : (
                      <span className="loading-dots">Thinking</span>
                    )}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!imageData && !voxelCode && !isLoading && status !== 'error' && (
                <div className="text-gray-400 text-center px-4 pointer-events-none">
                  <p className="text-sm">Select an example, or create your own!</p>
                </div>
              )}

              {/* Image View */}
              {imageData && viewMode === 'image' && !isLoading && (
                <img src={imageData} alt="Generated or Uploaded" className="w-full h-full object-contain" />
              )}

              {/* Voxel View */}
              {voxelCode && viewMode === 'voxel' && !isLoading && (
                <iframe
                  title="Voxel Scene"
                  srcDoc={voxelCode}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                />
              )}
            </div>

            {/* Action Buttons */}
            {(imageData || voxelCode) && (
              <div className="flex flex-wrap gap-2 pt-2">
                {imageData && voxelCode && (
                  <button
                    type="button"
                    onClick={() => setViewMode(viewMode === 'image' ? 'voxel' : 'image')}
                    disabled={isLoading}
                    className="flex-1 min-w-[100px] py-2.5 border-2 border-black bg-white font-bold uppercase transition-all duration-200 disabled:opacity-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-xs"
                  >
                    {viewMode === 'image' ? 'View Scene' : 'View Image'}
                  </button>
                )}

                {(imageData || voxelCode) && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isLoading}
                    className="flex-1 min-w-[100px] py-2.5 border-2 border-black bg-white font-bold uppercase transition-all duration-200 disabled:opacity-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-xs"
                  >
                    {viewMode === 'voxel' ? 'Download HTML' : 'Download Image'}
                  </button>
                )}

                {imageData && (
                  <button
                    type="button"
                    onClick={handleVoxelize}
                    disabled={isLoading}
                    className="flex-1 min-w-[120px] py-2.5 bg-black text-white border-2 border-black font-bold uppercase disabled:opacity-50 transition-all duration-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] hover:bg-gray-900 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-0 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.5)] text-xs"
                  >
                    {voxelCode ? 'Regenerate Voxels' : 'Generate Voxels'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
