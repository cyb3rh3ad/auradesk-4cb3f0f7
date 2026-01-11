// Supabase configuration with Electron fallback support
// This ensures the app works in both web and packaged Electron environments

// Fallback values for when environment variables are not available (Electron)
const FALLBACK_SUPABASE_URL = 'https://jtbxuiyhuyvqvdkqqioo.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0Ynh1aXlodXl2cXZka3FxaW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NTczNjksImV4cCI6MjA3NjUzMzM2OX0.-vQi3Y6GxKtybnf5mB-DIAosQLGRruwq5FR3VFlLFpw';

// Get environment value with fallback
const getEnvValue = (envKey: string, fallback: string): string => {
  try {
    // Try Vite environment variables first
    const viteEnv = import.meta.env?.[envKey];
    if (viteEnv && viteEnv.trim()) {
      return viteEnv;
    }
  } catch {
    // import.meta.env may not be available
  }
  
  return fallback;
};

export const SUPABASE_URL = getEnvValue('VITE_SUPABASE_URL', FALLBACK_SUPABASE_URL);
export const SUPABASE_ANON_KEY = getEnvValue('VITE_SUPABASE_PUBLISHABLE_KEY', FALLBACK_SUPABASE_ANON_KEY);

// Helper function to get the functions URL
export const getSupabaseFunctionsUrl = () => `${SUPABASE_URL}/functions/v1`;

// Check if we're running in Electron
export const isElectron = (): boolean => {
  try {
    return !!(window as any).electronAPI?.isElectron;
  } catch {
    return false;
  }
};
