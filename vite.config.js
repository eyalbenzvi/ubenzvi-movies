import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `base: './'` produces relative asset paths, so the same build works on
// https://<user>.github.io/<repo>/ AND on a custom domain root.
// Routing uses HashRouter, so refreshing a deep link never hits a 404.
// Override with VITE_BASE=/some-path/ if you ever need an absolute base.
export default defineConfig({
  base: process.env.VITE_BASE || './',
  plugins: [react(), tailwindcss()],
})
