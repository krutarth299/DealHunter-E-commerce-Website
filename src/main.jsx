import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import ErrorBoundary from './ErrorBoundary.jsx'
import { HelmetProvider } from 'react-helmet-async'

const rootElement = document.getElementById('root');
const app = (
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>
);

if (rootElement.hasChildNodes()) {
  rootElement.innerHTML = '';
}
createRoot(rootElement).render(app);
