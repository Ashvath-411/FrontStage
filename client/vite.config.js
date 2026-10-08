import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const insidiaFiles = [
  ['insidia.woff2', 'woff2'],
  ['insidia.woff', 'woff'],
  ['insidia.otf', 'opentype'],
  ['insidia.ttf', 'truetype']
];

function insidiaFontFace() {
  const fontsFolder = fileURLToPath(new URL('./public/fonts/', import.meta.url));
  const sources = insidiaFiles
    .filter(([fileName]) => existsSync(fontsFolder + fileName))
    .map(([fileName, format]) => `url('/fonts/${fileName}') format('${format}')`);
  if (sources.length === 0) return '';
  return `@font-face{font-family:'Insidia';src:${sources.join(',')};font-display:swap;}`;
}

function insidiaFontPlugin() {
  return {
    name: 'insidia-font-face',
    transformIndexHtml() {
      const css = insidiaFontFace();
      if (!css) return [];
      return [{ tag: 'style', children: css, injectTo: 'head' }];
    }
  };
}

const serverUrl = `http://localhost:${process.env.PORT || 3000}`;

export default defineConfig({
  plugins: [tailwindcss(), insidiaFontPlugin()],
  server: {
    proxy: {
      '/api': serverUrl,
      '/socket.io': { target: serverUrl, ws: true }
    }
  }
});
