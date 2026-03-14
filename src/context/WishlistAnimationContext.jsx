import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { WishlistAnimationContext } from './wishlistAnimationContextDefinition';

export const WishlistAnimationProvider = ({ children }) => {
    const wishlistRef = useRef(null); 
    const [arrivalEffect, setArrivalEffect] = useState(null); 

    const flyToWishlist = () => {
        // Animation removed as per user request
    };

    return (
        <WishlistAnimationContext.Provider value={{ flyToWishlist, wishlistRef, arrivalEffect }}>
            {children}
        </WishlistAnimationContext.Provider>
    );
};
