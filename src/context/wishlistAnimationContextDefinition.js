import { createContext, useContext } from 'react';
const DEFAULT_VALUE = { flyToWishlist: () => {}, wishlistRef: { current: null }, arrivalEffect: null };
export const WishlistAnimationContext = createContext(DEFAULT_VALUE);
export const useWishlistAnimation = () => {
    const context = useContext(WishlistAnimationContext);
    return context || DEFAULT_VALUE;
};
