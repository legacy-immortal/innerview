import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from '@/components/ui/provider';
import { PerformanceStartup } from '@/components/PerformanceStartup';
import App from '@/App';

// Dev diagnostic: capture "script tag while rendering React component" stack.
if (typeof window !== 'undefined') {
  const w = window as unknown as { __reactScriptTagErrors?: unknown[] };
  w.__reactScriptTagErrors = w.__reactScriptTagErrors || [];
  const orig = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const msg = args.map(String).join(' ');
    if (msg.includes('script tag while rendering React component')) {
      w.__reactScriptTagErrors?.push({
        args: msg.slice(0, 500),
        stack: new Error('capture').stack?.slice(0, 4000),
      });
    }
    orig(...args);
  };
}

function Root() {
  const [startupComplete, setStartupComplete] = useState(false);
  const skip =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).has('skipStartup') ||
      localStorage.getItem('innerview.skipStartup') === 'true');

  return (
    <Provider>
      {skip ? (
        <App />
      ) : (
        <PerformanceStartup onComplete={() => setStartupComplete(true)}>
          {startupComplete && <App />}
        </PerformanceStartup>
      )}
    </Provider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
