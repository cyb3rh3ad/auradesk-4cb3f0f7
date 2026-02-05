import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// CRITICAL: Handle OAuth tokens BEFORE React renders
// This prevents the splash screen from intercepting the OAuth callback
const handleOAuthTokens = () => {
  if (typeof window === 'undefined') return;
  
  const hash = window.location.hash;
  const search = window.location.search;
  
  // Check for OAuth callback parameters in various formats
  // HashRouter: tokens might be in hash after #/auth or directly in hash
  // e.g., #access_token=... or #/auth#access_token=... or ?code=...
  
  const hasAccessToken = hash.includes('access_token=') || hash.includes('access_token%3D');
  const hasRefreshToken = hash.includes('refresh_token=') || hash.includes('refresh_token%3D');
  const hasCode = search.includes('code=');
  
  if (hasAccessToken || hasRefreshToken || hasCode) {
    // Mark as OAuth callback to skip splash screen and prevent loops
    sessionStorage.setItem('oauth_login_pending', 'true');
    
    // Extract tokens if they're embedded in a double-hash scenario
    // e.g., #/auth#access_token=xxx&refresh_token=yyy
    if (hash.includes('#access_token=') && !hash.startsWith('#access_token')) {
      const tokenPart = hash.split('#access_token=')[1];
      if (tokenPart) {
        // Reconstruct proper hash for Supabase to parse
        window.location.hash = 'access_token=' + tokenPart;
      }
    }
  }
};

// Execute before React initializes
handleOAuthTokens();

const rootElement = document.getElementById("root")!;
createRoot(rootElement).render(<App />);
