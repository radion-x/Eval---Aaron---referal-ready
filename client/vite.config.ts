import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      // string shorthand: '/foo' -> 'http://localhost:4567/foo'
      // '/api': 'http://localhost:3001', 
      // Using object syntax for more options if needed later:
      '/api': {
        target: 'http://localhost:35100', // Your backend server address
        changeOrigin: true, // Recommended for virtual hosted sites
        // rewrite: (path) => path.replace(/^\/api/, '') // Optional: if your backend doesn't expect /api prefix
      }
    }
  }
});
