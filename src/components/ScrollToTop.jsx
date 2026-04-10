import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import {
    forceScrollToPageTop,
    resetProductRouteScroll,
    setManualScrollRestoration
} from "../utils/scroll";

export default function ScrollToTop() {
    const { pathname, search, hash, key } = useLocation();

    useEffect(() => {
        setManualScrollRestoration();
    }, []);

    useLayoutEffect(() => {
        setManualScrollRestoration();

        const isProductPage = pathname.startsWith('/product/');

        // Skip for deals page as it handles its own section-based scrolling
        if (pathname === '/deals') return;
        if (hash && !isProductPage) return;

        forceScrollToPageTop();

        if (isProductPage) {
            resetProductRouteScroll();
        }
    }, [pathname, search, hash, key]);

    return null;
}
