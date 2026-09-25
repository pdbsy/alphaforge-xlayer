import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
export default defineConfig(({ mode }) => ({
  publicDir: mode === 'xlayer' || mode === 'xlayer-preview' ? false : '../../docs',
  plugins: [
    {
      name: 'alphaforge-xlayer-release-mode',
      transformIndexHtml(html) {
        if (mode !== 'xlayer' && mode !== 'xlayer-preview') return html;
        return html.replace(
          '<script src="/user-ui.js"></script>',
          `<script src="/${mode === 'xlayer' ? 'xlayer-mode.js' : 'xlayer-preview-mode.js'}"></script>\n<script src="/user-ui.js"></script>`,
        );
      },
      generateBundle() {
        if (mode === 'xlayer')
          this.emitFile({
            type: 'asset',
            fileName: 'xlayer-mode.js',
            source: 'window.AF_PUBLIC_MODE = true;\n',
          });
        if (mode === 'xlayer-preview')
          this.emitFile({
            type: 'asset',
            fileName: 'xlayer-preview-mode.js',
            source: 'window.AF_PREVIEW_MODE = true;\n',
          });
      },
    },
    {
      name: 'alphaforge-user-ui-assets',
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          const fileName =
            request.url === '/user-ui.css'
              ? 'user-ui.css'
              : request.url === '/user-ui.js'
                ? 'user-ui.js'
                : null;
          if (!fileName) return next();
          try {
            response.statusCode = 200;
            response.setHeader(
              'content-type',
              fileName.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8',
            );
            response.end(await readFile(new URL(`../../build/ui-import/${fileName}`, import.meta.url)));
          } catch {
            next();
          }
        });
      },
      async generateBundle() {
        for (const fileName of ['user-ui.css', 'user-ui.js']) {
          this.emitFile({
            type: 'asset',
            fileName,
            source: await readFile(new URL(`../../build/ui-import/${fileName}`, import.meta.url)),
          });
        }
      },
    },
  ],
  build: {
    outDir:
      mode === 'xlayer'
        ? '../../dist/xlayer/web'
        : mode === 'xlayer-preview'
          ? '../../dist/xlayer/preview'
          : 'dist',
    sourcemap: false,
    emptyOutDir: true,
  },
  server: { host: '127.0.0.1' },
}));
