import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Static export-friendly. Use '/' for custom domain / CF tunnel;
// GitHub project pages can override with VITE_BASE.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
})
