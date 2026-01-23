Image to Voxel turns a prompt into an image, then generates a voxel-art HTML scene inspired by that image.

## Features

- Prompt-to-image generation for a clean subject on a simple background.
- Voxel scene generation as a single-page Three.js HTML file.
- Client-side UI with secure server-side API routes for keys.

## Tech Stack

- Next.js App Router
- OpenAI image generation
- Google Gemini for voxel scene code
- Three.js (generated output)

## Getting Started

Install dependencies:

```bash
npm install
```

Configure environment variables:

Create `.env.local` with:

```
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Usage

1. Enter a prompt and generate an image.
2. Generate the voxel scene from the image.
3. Save or copy the generated HTML output.

## Notes

- Node 20+ is recommended (some dependencies require Node 20).
- The image route uses OpenAI; the voxel route uses Gemini.

## Project Structure

- `src/app/api/generate-image/route.ts` - image generation endpoint
- `src/app/api/generate-voxel/route.ts` - voxel HTML generation endpoint
- `src/lib/gemini.ts` - client helpers and prompt template

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
