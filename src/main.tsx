import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Handle OAuth tokens BEFORE React renders
// This is critical for mobile browsers where HashRouter interferes with token parsing
const processOAuthTokens = async () => {
  const url = window.location.href;
  const hash = window.location.hash;
  
  // Check if we have OAuth tokens in the URL (can be in hash or after the hash route)
  // Examples:
  // - https://example.com/#access_token=...
  // - https://example.com/?access_token=...
  // - https://example.com/#/auth#access_token=... (broken double-hash)
  
  let tokenFragment = '';
  
  // Check for double-hash (HashRouter + OAuth tokens)
  const doubleHashMatch = url.match(/#\/[^#]*#(.+)/);
  if (doubleHashMatch) {
    tokenFragment = doubleHashMatch[1];
  } 
  // Check for tokens directly in hash (no HashRouter route)
  else if (hash && !hash.startsWith('#/') && hash.includes('access_token')) {
    tokenFragment = hash.substring(1); // Remove the #
  }
  // Check for tokens in query string
  else if (window.location.search.includes('access_token')) {
    tokenFragment = window.location.search.substring(1); // Remove the ?
  }
  
  if (tokenFragment && tokenFragment.includes('access_token')) {
    console.log('[OAuth] Tokens detected in URL, processing before app render...');
    
    try {
      // Parse the tokens
      const params = new URLSearchParams(tokenFragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      
      if (accessToken && refreshToken) {
        // Import supabase client
        const { supabase } = await import('./integrations/supabase/client');
        
        // Set the session with extracted tokens
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (error) {
          console.error('[OAuth] Failed to set session:', error);
        } else {
          console.log('[OAuth] Session set successfully');
          // Mark as OAuth login for MFA handling
          sessionStorage.setItem('oauth_login_pending', 'true');
          sessionStorage.setItem('oauth_login_time', Date.now().toString());
        }
      }
    } catch (err) {
      console.error('[OAuth] Error processing tokens:', err);
    }
    
    // Clean the URL - remove tokens but preserve the hash route if any
    const cleanUrl = window.location.origin + window.location.pathname + '#/';
    window.history.replaceState({}, '', cleanUrl);
  }
};

// Process OAuth tokens first, then render app
processOAuthTokens().then(() => {
  const rootElement = document.getElementById("root")!;
  createRoot(rootElement).render(<App />);
});
