import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Basis-Pfad für GitHub Pages:
// - Produktion (main):  /PersonalCalendar/
// - Test (develop):     /PersonalCalendar/test/   (via DEPLOY_BASE im CI)
export default defineConfig({
  base: process.env.DEPLOY_BASE || '/PersonalCalendar/',
  plugins: [react()],
});
