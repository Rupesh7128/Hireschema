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
        // Target modern browsers that support ES modules properly
        target: 'es2020',
        rollupOptions: {
          output: {
            // Use a function-based approach to ensure React is always in the same chunk
            // as libraries that depend on it (framer-motion, recharts use forwardRef)
            manualChunks(id) {
              // Keep React and React-DOM together, and ensure they load first
              if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
                return 'react-vendor';
              }
              // Bundle framer-motion with its React dependency awareness
              if (id.includes('node_modules/framer-motion')) {
                return 'motion';
              }
              // Bundle recharts separately
              if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
                return 'charts';
              }
              // AI SDK
              if (id.includes('node_modules/@google/generative-ai')) {
                return 'ai-sdk';
              }
              // Markdown
              if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark') || id.includes('node_modules/rehype')) {
                return 'markdown';
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
        },
        // Critical: dedupe React to prevent multiple instances
        dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime']
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'framer-motion', 'recharts'],
        // Force pre-bundling to resolve React dependencies correctly
        esbuildOptions: {
          target: 'es2020'
        }
      },
      // Ensure consistent module resolution
      esbuild: {
        target: 'es2020'
      }
    };
});
