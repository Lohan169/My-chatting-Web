
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/My-chatting-Web/',
  server: {
    port: 3000,
  },
});
