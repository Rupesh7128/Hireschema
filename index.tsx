import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  // Fallback if root is missing (rare)
  document.body.innerHTML = '<div style="color: #ef4444; padding: 20px; font-family: sans-serif;">CRITICAL ERROR: Root element not found.</div>';
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Application Crash:", error);
  // Display error on screen instead of black screen
  rootElement.innerHTML = `
    <div style="
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      background: #09090b; 
      color: #e4e4e7; 
      font-family: monospace; 
      text-align: center;
      padding: 20px;
    ">
      <h2 style="color: #f97316; margin-bottom: 10px;">System Failure</h2>
      <p>The application failed to initialize.</p>
      <pre style="background: #18181b; padding: 15px; border-radius: 8px; margin-top: 20px; color: #ef4444; max-width: 800px; overflow: auto;">
        ${(error as Error).message}
      </pre>
    </div>
  `;
}