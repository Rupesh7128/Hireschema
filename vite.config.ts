import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      build: {
        chunkSizeWarningLimit: 1500,
        target: 'es2020',
        // CRITICAL: Disable manual chunking to prevent React forwardRef issues
        // Manual chunking can cause React to load after libraries that depend on it
        rollupOptions: {
          output: {
            // Let Vite handle chunking automatically - this is more reliable
            // for libraries like framer-motion and recharts that use forwardRef
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
        },
        // Critical: dedupe React to prevent multiple instances
        dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime']
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'framer-motion', 'recharts'],
        esbuildOptions: {
          target: 'es2020'
        }
      },
      esbuild: {
        target: 'es2020'
      }
    };
});
