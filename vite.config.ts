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
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('@google/generative-ai')) return 'ai-sdk';
                if (id.includes('recharts')) return 'charts';
                if (id.includes('framer-motion')) return 'motion';
                if (id.includes('react-markdown')) return 'markdown';
                if (id.includes('/react')) return 'react';
                return 'vendor';
              }
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
          'react': path.resolve(__dirname, 'node_modules/react'),
          'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        },
        dedupe: ['react', 'react-dom']
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-to-print']
      }
    };
});
