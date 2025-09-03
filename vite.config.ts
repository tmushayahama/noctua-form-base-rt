import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tsChecker from 'vite-plugin-checker'
import { loadEnv } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const outDir = env.VITE_OUTPUT_PATH || 'dist'

  return {
    base: env.VITE_BASE_URL,
    logLevel: 'info',
    plugins: [
      react(),
      tsChecker({ typescript: true }),
      visualizer({
        filename: `${outDir}/stats-treemap.html`,
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      }),
      visualizer({
        filename: `${outDir}/stats-sunburst.html`,
        template: 'sunburst',
        gzipSize: true,
        brotliSize: true,
      }),
      visualizer({
        filename: `${outDir}/stats-network.html`,
        template: 'network',
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    build: {
      outDir,
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('@mui')) return 'mui'
            if (id.includes('framer-motion')) return 'framer-motion'
          },
          assetFileNames: (assetInfo) => {
            let extType = assetInfo.name.split('.').at(1);
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              extType = 'img';
            }
            return `assets/${extType}/[name]-[hash][extname]`;
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 4208,
      open: true
    },
    preview: {
      port: 4208
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: 'src/setupTests',
      mockReset: true,
    },
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
    },
  }
})