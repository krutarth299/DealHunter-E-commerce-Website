import { StrictMode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router';

import { PassThrough } from 'stream';
import { App, AppContent } from './App';
import ErrorBoundary from './ErrorBoundary';

export async function render(url, preloadedDeals = [], preloadedCategories = []) {
  const helmetContext = {};

  try {
    const html = await new Promise((resolve, reject) => {
      let didError = false;
      const stream = new PassThrough();
      let htmlBuffer = '';

      stream.on('data', (chunk) => {
        htmlBuffer += chunk.toString();
      });

      stream.on('end', () => {
        if (didError && !htmlBuffer) {
          reject(new Error('SSR stream ended after an unrecoverable rendering error.'));
          return;
        }
        resolve(htmlBuffer);
      });

      stream.on('error', reject);

      const { pipe, abort } = renderToPipeableStream(
        <StrictMode>
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
        </StrictMode>,
        {
          onAllReady() {
            pipe(stream);
          },
          onError(error) {
            didError = true;
            console.error('[SSR Entry Server Error]:', error);
          }
        }
      );

      setTimeout(() => {
        if (!htmlBuffer) {
          abort();
          reject(new Error('SSR render timed out before completing.'));
        }
      }, 10000);
    });

    const { helmet } = helmetContext;

    return { 
      html, 
      helmet: {
        title: helmet?.title,
        meta: helmet?.meta,
        link: helmet?.link,
        script: helmet?.script
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
