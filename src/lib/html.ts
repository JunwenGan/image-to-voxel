/**
 * Extracts a complete HTML document from a string that might contain
 * conversational text, markdown code blocks, etc.
 */
export const extractHtmlFromText = (text: string): string => {
  if (!text) return '';

  // Debug: log raw response length
  console.log('Raw response length:', text.length);

  // 1. Try to extract from markdown code blocks first (most common from AI)
  const codeBlockMatch = text.match(/```(?:html)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const extracted = codeBlockMatch[1].trim();
    console.log('Extracted from code block, length:', extracted.length);
    return extracted;
  }

  // 2. Try to find a complete HTML document structure
  const htmlMatch = text.match(/(<!DOCTYPE html>|<html)[\s\S]*<\/html>/i);
  if (htmlMatch) {
    console.log('Found HTML document, length:', htmlMatch[0].length);
    return htmlMatch[0];
  }

  // 3. Check if the text itself starts with HTML-like content
  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    console.log('Text starts with HTML');
    return text.trim();
  }

  // 4. Return raw text if no structure is found
  console.log('No HTML structure found, returning raw text');
  return text.trim();
};

/**
 * Injects CSS into the HTML to hide common text elements
 */
export const hideBodyText = (html: string): string => {
  const cssToInject = `
    <style>
      #info, #loading, #ui, #instructions, .label, .overlay, #description,
      p, h1, h2, h3, h4, h5, h6, div:not(#container):not(.scene) {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
      }
      body {
        user-select: none !important;
        margin: 0 !important;
        overflow: hidden !important;
        background: transparent !important;
      }
      body > *:not(canvas):not(script) {
        display: none !important;
      }
      canvas {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
    </style>
  `;

  if (html.toLowerCase().includes('</head>')) {
    return html.replace(/<\/head>/i, `${cssToInject}</head>`);
  }
  if (html.toLowerCase().includes('</body>')) {
    return html.replace(/<\/body>/i, `${cssToInject}</body>`);
  }
  return html + cssToInject;
};

/**
 * Zooms the camera in by modifying camera.position.set() calls
 */
export const zoomCamera = (html: string, zoomFactor: number = 0.8): string => {
  const regex =
    /camera\.position\.set\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)/g;

  return html.replace(regex, (match, x, y, z) => {
    const newX = parseFloat(x) * zoomFactor;
    const newY = parseFloat(y) * zoomFactor;
    const newZ = parseFloat(z) * zoomFactor;
    return `camera.position.set(${newX}, ${newY}, ${newZ})`;
  });
};

/**
 * Fix Three.js imports to use CDN URLs
 */
export const fixThreeImports = (html: string): string => {
  // Add import map if not present
  const importMap = `
    <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
        "three/": "https://unpkg.com/three@0.160.0/",
        "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
      }
    }
    </script>
  `;

  // Check if import map already exists
  if (html.includes('importmap')) {
    return html;
  }

  // Insert import map before the first <script type="module"> or after <head>
  if (html.includes('<script type="module">')) {
    return html.replace(
      '<script type="module">',
      `${importMap}\n    <script type="module">`
    );
  }

  if (html.toLowerCase().includes('</head>')) {
    return html.replace(
      /<\/head>/i,
      `${importMap}\n</head>`
    );
  }

  // If no head tag, add before first script
  if (html.includes('<script')) {
    return html.replace('<script', `${importMap}\n<script`);
  }

  return html;
};

/**
 * Process the generated HTML with all enhancements
 */
export const processGeneratedHtml = (html: string): string => {
  // First extract actual HTML from any surrounding text
  let processed = extractHtmlFromText(html);
  processed = fixThreeImports(processed);
  processed = hideBodyText(processed);
  processed = zoomCamera(processed);
  return processed;
};
