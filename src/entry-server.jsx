import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import { App, AppContent } from './App';
import ErrorBoundary from './ErrorBoundary';

export async function render(url, preloadedDeals = [], preloadedCategories = []) {
  const helmetContext = {};

  try {
    const html = renderToString(
      <StrictMode>
        <HelmetProvider context={helmetContext}>
          <ErrorBoundary>
            <App>
              <StaticRouter location={url}>
                <AppContent 
                  preloadedDeals={preloadedDeals} 
                  preloadedCategories={preloadedCategories} 
                />
              </StaticRouter>
            </App>
          </ErrorBoundary>
        </HelmetProvider>
      </StrictMode>
    );

    const { helmet } = helmetContext;

    return { 
      html, 
      helmet: {
        title: helmet?.title,
        meta: helmet?.meta,
        link: helmet?.link
      }
    };
  } catch (error) {
    console.error('[SSR Entry Server Error]:', error);
    // Fallback minimal render to prevent complete crash
    return { 
      html: `<div class="ssr-error">Internal Server Error During Render</div>`, 
      helmet: null 
    };
  }
}
