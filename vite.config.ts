import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


export default defineConfig({
  plugins: [react()],
  server: {
    // Auto-open the browser straight to the FlameTech home page when you
    // run `npm run dev` — this is the app itself (not the AI/Cinder page).
    open: '/',
  },
});