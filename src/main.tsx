import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Add visible error handling for debugging
const rootElement = document.getElementById("root");

if (!rootElement) {
  document.body.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #1a1a2e; color: white; font-family: sans-serif;">
      <div style="text-align: center;">
        <h1>Error: Root element not found</h1>
        <p>The application could not initialize.</p>
      </div>
    </div>
  `;
} else {
  try {
    const root = createRoot(rootElement);
    root.render(<App />);
  } catch (error) {
    console.error('React render error:', error);
    rootElement.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #1a1a2e; color: white; font-family: sans-serif;">
        <div style="text-align: center; max-width: 600px; padding: 20px;">
          <h1>Application Error</h1>
          <p>Failed to start the application.</p>
          <pre style="text-align: left; background: #2a2a3e; padding: 15px; border-radius: 8px; overflow: auto; font-size: 12px; margin-top: 20px;">${error instanceof Error ? error.message : String(error)}</pre>
        </div>
      </div>
    `;
  }
}
