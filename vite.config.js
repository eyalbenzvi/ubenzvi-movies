import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Content-Security-Policy for the production build. GitHub Pages can't send headers,
// so it is injected as the first <meta> in <head>. (Not used in dev: Vite's HMR needs inline code.)
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: https://drive.google.com https://*.googleusercontent.com",
  "frame-src https://drive.google.com https://docs.google.com",
  "connect-src 'self'",
  "manifest-src 'self'",
  "media-src 'none'",
  "object-src 'none'",
  "worker-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  'upgrade-insecure-requests',
].join('; ')

const securityMeta = {
  name: 'security-meta',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<head>',
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`,
    ),
}

// `base: './'` produces relative asset paths, so the same build works on
// https://<user>.github.io/<repo>/ AND on a custom domain root.
// Routing uses HashRouter, so refreshing a deep link never hits a 404.
export default defineConfig({
  base: process.env.VITE_BASE || './',
  plugins: [react(), tailwindcss(), securityMeta],
})
