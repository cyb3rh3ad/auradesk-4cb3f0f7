import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: "./",
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 // 24 hours
                }
              }
            }
          ]
        },
        manifest: false, // We use our own manifest.json
        devOptions: {
          enabled: false
        }
      })
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    envPrefix: ["VITE_"],
    build: {
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || 'https://jtbxuiyhuyvqvdkqqioo.supabase.co'),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0Ynh1aXlodXl2cXZka3FxaW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NTczNjksImV4cCI6MjA3NjUzMzM2OX0.-vQi3Y6GxKtybnf5mB-DIAosQLGRruwq5FR3VFlLFpw'),
    },
  };
});
