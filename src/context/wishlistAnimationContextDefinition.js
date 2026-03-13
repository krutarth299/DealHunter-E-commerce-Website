import { createContext, useContext } from 'react';
export const WishlistAnimationContext = createContext();
export const useWishlistAnimation = () => useContext(WishlistAnimationContext);
