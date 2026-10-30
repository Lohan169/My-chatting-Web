import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/Lohan_Chat_App/',
  server: {
    port: 3000,
  },
});