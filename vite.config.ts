import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    // Define the environment variables that should be available at build time
    // but not leaked into the client bundle
    define: {
      // Ensure that we're using placeholder values at build time
      // that will be replaced at runtime by Netlify's environment variables
      '__SUPABASE_URL__': JSON.stringify(process.env.SUPABASE_URL || 'SUPABASE_URL'),
      '__SUPABASE_ANON_KEY__': JSON.stringify(process.env.SUPABASE_ANON_KEY || 'SUPABASE_ANON_KEY'),
    },
  };
});