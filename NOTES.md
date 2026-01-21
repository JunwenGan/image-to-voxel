# Project Notes: image-to-voxel

## What this is
- A Next.js App Router web app that turns images into voxel-style 3D scenes.
- Users can upload an image, generate one with AI, or choose example scenes.

## Core features
- AI image generation (prompt -> image data URL).
- Voxelization (image -> Three.js HTML).
- Example gallery with prebuilt HTML + thumbnail previews.
- Viewer that toggles between image and voxel scene.

## Key folders and files
- src/app/page.tsx: main UI, state, and handlers.
- src/lib/gemini.ts: Gemini SDK integration for image generation + voxelization.
- src/lib/html.ts: HTML extraction and post-processing (import map, hide text, camera zoom).
- public/examples/: example HTML + PNG thumbnails.
- src/types/index.ts: app state and data types.

## Frontend architecture
- Single client component (page.tsx) manages:
  - Input state (prompt, aspect ratio, optimize toggle)
  - Content state (imageData, voxelCode, userContent)
  - UI state (selected tile, status, errors, view mode)
- Viewer uses iframe with srcDoc to render generated HTML.
- Tailwind v4 for styling; custom animation helpers in globals.css.

## AI pipeline
- generateImage(): calls Gemini text-to-image model and returns base64 data URL.
- generateVoxelScene(): sends image to Gemini vision model and returns HTML.
- processGeneratedHtml(): cleans and injects import maps so HTML runs in iframe.

## Important behaviors
- Examples load HTML and a preview image, then set view to voxel.
- Upload/AI image starts in image view; voxelization switches to iframe view.

## Full-stack learnings
- React/Next UI + client state management.
- LLM prompt design and model orchestration.
- HTML post-processing and content safety.
- Asset management via public/ for fast static serving.

## Limitations / gotchas
- Image generation requires an image-capable model; some models are text-only.
- NEXT_PUBLIC_GEMINI_API_KEY is exposed to the browser; use server routes for secrecy.
- Rate limits and quotas can block generation.

## Suggested next steps
1) Move Gemini calls server-side (API routes) to protect keys and centralize errors.
2) Add friendly quota/rate-limit error states with retry UX.
3) Cache voxel outputs per image to avoid repeated calls.
4) Add an offline demo mode with stored examples.
