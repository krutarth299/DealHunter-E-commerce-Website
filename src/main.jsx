import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App, AppContent } from './App.jsx'
import { BrowserRouter } from 'react-router-dom'

import ErrorBoundary from './ErrorBoundary.jsx'
import { HelmetProvider } from 'react-helmet-async'

const rootElement = document.getElementById('root');

createRoot(rootElement).render(
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </App>
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>
);
