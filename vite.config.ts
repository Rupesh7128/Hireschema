import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import aiGenerate from './api/ai-generate';
import aiResume from './api/ai-resume';
import aiCoverLetter from './api/ai-cover-letter';
import aiInterview from './api/ai-interview';
import aiGaps from './api/ai-gaps';
import aiLanguages from './api/ai-languages';
import verifyPayment from './api/verify-payment';
import redeemPromo from './api/redeem-promo';

export default defineConfig(({ mode }) => {
  const isPlaceholder = (value: unknown) => {
    const v = String(value || '').toLowerCase();
    return v.includes('your_openai') || v.includes('your_ope') || v.includes('your_api_key') || v.includes('replace_with');
  };

  if (isPlaceholder(process.env.OPENAI_API_KEY)) delete process.env.OPENAI_API_KEY;
  if (isPlaceholder(process.env.VITE_OPENAI_API_KEY)) delete process.env.VITE_OPENAI_API_KEY;

  const env = loadEnv(mode, '.', '');
  Object.assign(process.env, env);
  const massblogBaseUrl = env.MASSBLOG_URL || env.VITE_MASSBLOG_URL || 'https://www.massblogger.com';
  const massblogApiKey = env.MASSBLOG_API || env.VITE_MASSBLOG_API || '';
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/massblog': {
          target: massblogBaseUrl,
          changeOrigin: true,
          rewrite: (p) => {
            const rewritten = p.replace(/^\/api\/massblog/, '/api');
            if (!massblogApiKey) return rewritten;
            const hasQuery = rewritten.includes('?');
            return `${rewritten}${hasQuery ? '&' : '?'}apiKey=${encodeURIComponent(massblogApiKey)}`;
          },
        },
      },
      fs: {
        allow: ['..']
      }
    },
    plugins: [
      react(),
      {
        name: 'local-api-routes',
        configureServer(server) {
          const readBody = (req: any) =>
            new Promise<string>((resolve) => {
              let data = '';
              req.on('data', (chunk: any) => {
                data += String(chunk);
              });
              req.on('end', () => resolve(data));
              req.on('error', () => resolve(''));
            });

          const enhanceRes = (res: any) => {
            res.status = (code: number) => {
              res.statusCode = code;
              return res;
            };
            res.json = (jsonBody: any) => {
              if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(jsonBody));
              return res;
            };
            res.send = (body: any) => {
              if (typeof body === 'object') return res.json(body);
              res.end(String(body));
              return res;
            };
            res.redirect = (statusOrUrl: string | number, url?: string) => {
              const status = typeof statusOrUrl === 'number' ? statusOrUrl : 302;
              const location = typeof statusOrUrl === 'string' ? statusOrUrl : String(url || '/');
              res.statusCode = status;
              res.setHeader('Location', location);
              res.end();
              return res;
            };
            return res;
          };

          server.middlewares.use(async (req: any, res: any, next: any) => {
            const url = String(req.url || '');
            if (!url.startsWith('/api/')) return next();

            try {
              if (url.startsWith('/api/ai-generate')) {
                const raw = await readBody(req);
                req.body = raw || req.body;
                return aiGenerate(req, enhanceRes(res));
              }

              if (url.startsWith('/api/ai-resume')) {
                const raw = await readBody(req);
                req.body = raw || req.body;
                return aiResume(req, enhanceRes(res));
              }

              if (url.startsWith('/api/ai-cover-letter')) {
                const raw = await readBody(req);
                req.body = raw || req.body;
                return aiCoverLetter(req, enhanceRes(res));
              }

              if (url.startsWith('/api/ai-interview')) {
                const raw = await readBody(req);
                req.body = raw || req.body;
                return aiInterview(req, enhanceRes(res));
              }

              if (url.startsWith('/api/ai-gaps')) {
                const raw = await readBody(req);
                req.body = raw || req.body;
                return aiGaps(req, enhanceRes(res));
              }

              if (url.startsWith('/api/ai-languages')) {
                const raw = await readBody(req);
                req.body = raw || req.body;
                return aiLanguages(req, enhanceRes(res));
              }

              if (url.startsWith('/api/verify-payment')) {
                const raw = await readBody(req);
                req.body = raw || req.body;
                return verifyPayment(req, enhanceRes(res));
              }

              if (url.startsWith('/api/redeem-promo')) {
                const raw = await readBody(req);
                req.body = raw || req.body;
                return redeemPromo(req, enhanceRes(res));
              }
            } catch (e: any) {
              return enhanceRes(res).status(500).json({ ok: false, reason: String(e?.message || 'Local API error') });
            }

            return next();
          });
        },
      },
    ],
    build: {
      chunkSizeWarningLimit: 1500,
      target: 'es2020',
      minify: 'esbuild',
      cssMinify: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          // Ensure React is in a single chunk to prevent forwardRef issues
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['framer-motion', 'lucide-react'],
            'chart-vendor': ['recharts'],
          }
        }
      }
    },
    define: {
      '__ASSET_VERSION__': JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || Date.now().toString())
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // Force all React imports to use the same instance
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime']
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'framer-motion', 'recharts', 'lucide-react'],
      force: true, // Force re-optimization
      esbuildOptions: {
        target: 'es2020'
      }
    },
    esbuild: {
      target: 'es2020'
    }
  };
});
