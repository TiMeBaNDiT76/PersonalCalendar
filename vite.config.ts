import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Basis-Pfad für GitHub Pages: https://timebandit76.github.io/PersonalCalendar/
export default defineConfig({
  base: '/PersonalCalendar/',
  plugins: [react()],
});
