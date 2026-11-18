import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Two-Tier Quota Handling (Case A Demo Key protection)
declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

window.gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
};

const origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  origConsoleError.apply(console, args);
  try {
    const joined = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ');
    if (joined.includes('OverQuotaMapError') || joined.includes('QuotaExceededError')) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
  } catch {
    // ignore listener errors
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
