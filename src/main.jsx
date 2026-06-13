import { hydrateRoot, createRoot } from 'react-dom/client'
import { App, AppContent } from './App.jsx'
import { BrowserRouter } from 'react-router-dom'

import ErrorBoundary from './ErrorBoundary.jsx'

import { setManualScrollRestoration } from './utils/scroll.js'

const rootElement = document.getElementById('root');
setManualScrollRestoration();

// Retrieve Initial Isomorphic Props from Server Injection
const initialData = window.__INITIAL_DATA__;
const initialCategories = window.__INITIAL_CATEGORIES__;

const app = (
    <ErrorBoundary>
      <App>
        <BrowserRouter>
          <AppContent preloadedDeals={initialData} preloadedCategories={initialCategories} />
        </BrowserRouter>
      </App>
    </ErrorBoundary>
);

if (initialData && rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
