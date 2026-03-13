import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { WishlistAnimationContext } from './wishlistAnimationContextDefinition';

export const WishlistAnimationProvider = ({ children }) => {
    const [flyingItems, setFlyingItems] = useState([]);
    const wishlistRef = useRef(null); // Ref for the wishlist icon in Navbar

    const [arrivalEffect, setArrivalEffect] = useState(null); // { image: string } | null

    const flyToWishlist = (imageSrc, startRect) => {
        if (!wishlistRef.current) return;

        const endRect = wishlistRef.current.getBoundingClientRect();
        const id = Date.now();

        setFlyingItems(prev => [...prev, { id, imageSrc, startRect, endRect }]);

        // Trigger arrival effect when animation finishes (0.8s duration)
        setTimeout(() => {
            setArrivalEffect({ image: imageSrc });
            // Clear effect after 1.5 seconds
            setTimeout(() => setArrivalEffect(null), 1500);
        }, 800);

        // Remove item after animation
        setTimeout(() => {
            setFlyingItems(prev => prev.filter(item => item.id !== id));
        }, 800);
    };

    return (
        <WishlistAnimationContext.Provider value={{ flyToWishlist, wishlistRef, arrivalEffect }}>
            {children}
            {/* Flying Elements Layer */}
            <div className="fixed inset-0 pointer-events-none z-[9999]">
                <AnimatePresence>
                    {flyingItems.map(item => (
                        <motion.img
                            key={item.id}
                            src={item.image}
                            initial={{
                                top: item.startRect.top,
                                left: item.startRect.left,
                                width: item.startRect.width,
                                height: item.startRect.height,
                                opacity: 1,
                                scale: 1
                            }}
                            animate={{
                                top: item.endRect.top + 10, // Adjust to center
                                left: item.endRect.left + 10,
                                width: 20,
                                height: 20,
                                opacity: 0.5,
                                scale: 0.5
                            }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ duration: 0.8, ease: "anticipate" }}
                            className="absolute object-cover rounded-full shadow-xl"
                            style={{ position: 'fixed' }} // Ensure it's fixed relative to viewport
                        />
                    ))}
                </AnimatePresence>
            </div>
        </WishlistAnimationContext.Provider>
    );
};
