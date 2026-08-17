import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
 
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Default is 500 (kB). Firebase + recharts + lucide-react push the
    // main bundle past that, which is what's triggering the Vercel build
    // warning. Raising the limit just silences the warning; the
    // manualChunks below is what actually helps load time by splitting
    // vendor code into separate cacheable chunks instead of one big blob.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          charts: ['recharts'],
        },
      },
    },
  },
})