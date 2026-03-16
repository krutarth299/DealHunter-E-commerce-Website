import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
    const { pathname, search } = useLocation();

    useEffect(() => {
        // Skip for deals page as it handles its own section-based scrolling
        if (pathname === '/deals') return;

        try {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'smooth'
            });
        } catch (error) {
            // Fallback for older browsers
            window.scrollTo(0, 0);
        }
    }, [pathname, search]);

    return null;
}
