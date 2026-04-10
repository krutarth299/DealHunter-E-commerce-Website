export const setManualScrollRestoration = () => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
    }
};

const TOP_SCROLL_SELECTORS = [
    '#root',
    '#main-app-container',
    '.product-details-container'
];

const getScrollableAncestors = (node) => {
    if (!node || typeof window === 'undefined') return [];

    const ancestors = [];
    let current = node.parentElement;

    while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY);
        const canScrollX = /(auto|scroll|overlay)/.test(style.overflowX);

        if (canScrollY || canScrollX) {
            ancestors.push(current);
        }

        current = current.parentElement;
    }

    return ancestors;
};

const withInstantRootScroll = (callback) => {
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;

    root.style.scrollBehavior = 'auto';
    callback();
    root.style.scrollBehavior = previousScrollBehavior;
};

export const forceScrollToPageTop = (anchor = null) => {
    if (typeof window === 'undefined') return;

    const scrollTargets = [
        document.scrollingElement,
        document.documentElement,
        document.body,
        ...TOP_SCROLL_SELECTORS.map((selector) => document.querySelector(selector)),
        ...getScrollableAncestors(anchor)
    ].filter(Boolean);

    withInstantRootScroll(() => {
        try {
            window.scrollTo(0, 0);
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'auto'
            });
        } catch (error) {
            window.scrollTo(0, 0);
        }

        scrollTargets.forEach((target) => {
            target.scrollTop = 0;
            target.scrollLeft = 0;
        });

        if (anchor && typeof anchor.scrollIntoView === 'function') {
            anchor.scrollIntoView({
                block: 'start',
                inline: 'nearest',
                behavior: 'auto'
            });
        }
    });
};

export const prepareProductRouteNavigation = () => {
    setManualScrollRestoration();
    forceScrollToPageTop();
};

export const isProductRouteHref = (href = '') => {
    if (!href) return false;

    try {
        const url = new URL(href, window.location.origin);
        return url.origin === window.location.origin && /^\/product\/[^/]+/.test(url.pathname);
    } catch {
        return /^\/product\/[^/]+/.test(String(href));
    }
};

export const resetProductRouteScroll = (anchor = null) => {
    prepareProductRouteNavigation();
    forceScrollToPageTop(anchor);
};
