import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/massblog': {
            target: env.VITE_MASSBLOG_URL || 'https://www.massblogger.com',
            changeOrigin: true,
            rewrite: (p) => p.replace(/^\/api\/massblog/, '/api'),
          },
          // Proxy for other Vercel functions (requires a backend or vercel dev)
          '/api': {
            target: 'http://localhost:3002', 
            changeOrigin: true,
            bypass: (req, res) => {
              if (req.url?.startsWith('/api/massblog')) return false;
              console.warn(`[Vite Proxy] API route ${req.url} called but no backend is running. Use 'vercel dev' if available.`);
              return true; // Bypass proxy and let it fail normally (404) instead of returning index.html
            }
          }
        },
      },
      plugins: [react()],
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
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.OPENAI_API_KEY': JSON.stringify(env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY),
        'process.env.OPEN_ROUTER_API_KEY': JSON.stringify(env.VITE_OPEN_ROUTER_API_KEY || env.OPEN_ROUTER_API_KEY)
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
