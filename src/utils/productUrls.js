import { getDisplayTitle } from './productTitles.js';

export const getProductId = (product = {}) => (
  String(product.id || product._id || product.dealId || '').trim()
);

export const slugifyProductTitle = (title = '') => (
  String(title || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '') || 'product'
);

export const getProductSlug = (product = {}) => {
  const id = getProductId(product);
  const storedSlug = String(product.slug || product.pageSlug || '').trim().toLowerCase();
  const title = product.displayTitle || product.fullTitle || product.cardTitle || getDisplayTitle(product.title || product.originalTitle || product.rawTitle || '');
  const titleSlug = storedSlug || slugifyProductTitle(title);
  return id ? `${titleSlug}-${id}` : titleSlug;
};

export const getProductPath = (product = {}) => `/product/${getProductSlug(product)}`;

export const extractProductIdFromParam = (param = '') => {
  const value = String(param || '').trim();
  if (!value) return '';

  const objectIdMatch = value.match(/[a-f0-9]{24}$/i);
  if (objectIdMatch) return objectIdMatch[0];

  const trailingIdMatch = value.match(/-([a-z0-9]{8,})$/i);
  return trailingIdMatch?.[1] || value;
};

export const productMatchesParam = (product = {}, param = '') => {
  const value = String(param || '').trim();
  if (!value) return false;

  const productId = getProductId(product);
  if (productId && productId === value) return true;
  if (productId && productId === extractProductIdFromParam(value)) return true;
  return getProductSlug(product) === value;
};
