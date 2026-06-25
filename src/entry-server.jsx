import { StrictMode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router';

import { PassThrough } from 'stream';
import { App, AppContent } from './App';
import ErrorBoundary from './ErrorBoundary';
import { HelmetProvider } from 'react-helmet-async';

export async function render(url, preloadedDeals = [], preloadedCategories = [], preloadedBlogs = null, preloadedBlog = null) {
  const helmetContext = {};

  try {
    let html = await new Promise((resolve, reject) => {
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
        <HelmetProvider context={helmetContext}>
          <StrictMode>
              <ErrorBoundary>
                <App>
                  <StaticRouter location={url}>
                    <AppContent
                      preloadedDeals={preloadedDeals}
                      preloadedCategories={preloadedCategories}
                      preloadedBlogs={preloadedBlogs}
                      preloadedBlog={preloadedBlog}
                    />
                  </StaticRouter>
                </App>
              </ErrorBoundary>
          </StrictMode>
        </HelmetProvider>,
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

    // Extract react-helmet-async tags from HTML body
    const helmetRegex = /(<title[^>]*>.*?<\/title>|<meta(?!\s+charset)[^>]+>|<link(?!\s+(?:rel="stylesheet"|rel="preload"))[^>]+>|<script[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>)/gi;
    let extractedTags = [];
    html = html.replace(helmetRegex, (match) => {
      extractedTags.push(match);
      return ''; // remove them from body
    });

    return { 
      html, 
      helmet: {
        title: extractedTags.filter(t => t.startsWith('<title')).join('\n'),
        meta: extractedTags.filter(t => t.startsWith('<meta')).join('\n'),
        link: extractedTags.filter(t => t.startsWith('<link')).join('\n'),
        script: extractedTags.filter(t => t.startsWith('<script')).join('\n')
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
