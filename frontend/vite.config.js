import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Electron loads the built index.html via file://, where absolute paths
  // (the default) resolve against the filesystem root instead of dist/ and
  // produce a blank window. Relative paths work for both that and `vite preview`.
  base: "./",
  plugins: [react(), tailwindcss()],
})
