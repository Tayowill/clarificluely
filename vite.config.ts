import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      electron([
        {
          entry: 'electron/main.ts',
          vite: {
            define: {
              'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
              'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY),
            },
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron', 'keytar'],
              },
            },
          },
        },
        {
          entry: 'electron/preload.ts',
          onstart(options) {
            options.reload()
          },
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron'],
              },
            },
          },
        },
      ]),
      renderer(),
    ],
    base: './',
    server: {
      port: 5173,
      strictPort: true,
    },
  }
})
