import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from '@/components/ui/provider';
import { PerformanceStartup } from '@/components/PerformanceStartup';
import App from '@/App';

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
