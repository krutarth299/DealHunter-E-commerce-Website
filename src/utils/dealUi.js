import { getProductImageGallery } from './imageOptimizer.js';
import { createProductTitleSet } from './productTitles.js';

import { STORE_DETECTION_PATTERNS } from '../config/storeProfiles';

const STORE_PATTERNS = [
  ...STORE_DETECTION_PATTERNS
];

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const asPlainObject = (value = {}) => {
  if (!value || typeof value !== 'object') return {};
  if (value._doc && typeof value._doc === 'object') {
    return { ...value._doc, ...value };
  }
  return value;
};

const pickFirstString = (...candidates) => {
  for (const candidate of candidates.flat()) {
    if (candidate === null || candidate === undefined) continue;
    const normalized = String(candidate).trim();
    if (normalized) return normalized;
  }
  return '';
};

const pickImageValue = (input) => {
  if (!input) return '';
  if (typeof input === 'string') return input.trim();
  if (Array.isArray(input)) {
    for (const item of input) {
      const resolved = pickImageValue(item);
      if (resolved) return resolved;
    }
    return '';
  }
  if (typeof input === 'object') {
    return pickFirstString(input.url, input.src, input.image, input.imageUrl);
  }
  return '';
};

const slugifyText = (value = '') => (
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '') || 'product'
);

export const parsePriceNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const normalized = String(value)
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .replace(/[^0-9.]/g, '');

  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const pickPreferredPriceNumber = (...candidates) => {
  for (const candidate of candidates.flat()) {
    const parsed = parsePriceNumber(candidate);
    if (parsed !== null && parsed > 0) {
      return parsed;
    }
  }
  return 0;
};

const pickHighestPriceNumber = (...candidates) => (
  candidates
    .flat()
    .map((candidate) => parsePriceNumber(candidate))
    .filter((parsed) => parsed !== null && parsed > 0)
    .sort((a, b) => b - a)[0] || 0
);

const normalizePricePair = ({ dealPriceCandidates = [], mrpCandidates = [] } = {}) => {
  const cleanedMrpCandidates = mrpCandidates
    .flat()
    .map((candidate) => parsePriceNumber(candidate))
    .filter((parsed) => parsed !== null && parsed > 0);
  const hasExplicitMrp = cleanedMrpCandidates.length > 0;
  const dealPrice = pickPreferredPriceNumber(dealPriceCandidates);
  let mrp = cleanedMrpCandidates.sort((a, b) => b - a)[0] || null;

  // Preserve MRP if it exists
  if (!mrp && dealPrice) mrp = dealPrice;

  const discountPercent = dealPrice > 0 && mrp > dealPrice
    ? Math.round(((mrp - dealPrice) / mrp) * 100)
    : 0;

  return { dealPrice, mrp, discountPercent, hasExplicitMrp };
};

export const formatPriceDisplay = (value) => {
  const numeric = parsePriceNumber(value) ?? 0;
  return INR_FORMATTER.format(numeric).replace(/\u00a0/g, ' ');
};

export const formatDiscountDisplay = (value) => {
  const numeric = Number.parseInt(String(value ?? '').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(numeric) && numeric > 0 ? `${numeric}%` : '0%';
};

export const detectStoreName = (storeValue, productUrl = '') => {
  const rawStore = String(storeValue || '').trim();
  const haystack = `${rawStore} ${productUrl}`.toLowerCase();

  const matched = STORE_PATTERNS.find(({ patterns }) =>
    patterns.some((pattern) => haystack.includes(pattern))
  );

  if (matched) return matched.name;
  if (rawStore) {
    return rawStore
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  return 'Online Store';
};

const normalizeVariantForUi = (variant = {}, fallback = {}, index = 0) => {
  const rawVariant = asPlainObject(variant);
  const productUrl = String(rawVariant.productUrl || rawVariant.url || rawVariant.link || fallback.productUrl || '').trim();
  const imageGallery = getProductImageGallery({
    ...fallback,
    ...rawVariant,
    image: pickImageValue([rawVariant.image, rawVariant.mainImage, rawVariant.images, fallback.image]),
    images: Array.isArray(rawVariant.images) ? rawVariant.images : [],
    productUrl
  });
  const { dealPrice, mrp, discountPercent, hasExplicitMrp } = normalizePricePair({
    dealPriceCandidates: [rawVariant.dealPrice, rawVariant.price, fallback.dealPrice, fallback.price],
    mrpCandidates: [rawVariant.mrp, rawVariant.originalPrice, fallback.mrp, fallback.originalPrice]
  });
  const variantStore = detectStoreName(rawVariant.store || fallback.store || fallback.storeName, productUrl || fallback.productUrl || '');
  const isFlipkartStore = String(variantStore || '').toLowerCase().includes('flipkart');
  const variantTitleSet = createProductTitleSet(rawVariant.title || rawVariant.name || fallback.title);

  return {
    id: String(rawVariant.id || rawVariant.dealId || rawVariant.variantKey || index),
    dealId: String(rawVariant.dealId || rawVariant.id || ''),
    variantKey: String(rawVariant.variantKey || productUrl || rawVariant.id || index),
    type: String(rawVariant.type || rawVariant.variantType || 'Option'),
    label: String(rawVariant.label || rawVariant.variantLabel || rawVariant.title || `Option ${index + 1}`),
    title: String(rawVariant.title || fallback.title || ''),
    displayTitle: rawVariant.displayTitle || variantTitleSet.displayTitle,
    cardTitle: rawVariant.cardTitle || variantTitleSet.cardTitle,
    image: imageGallery[0] || rawVariant.image || fallback.image || '',
    images: imageGallery,
    price: dealPrice > 0 ? formatPriceDisplay(dealPrice) : (rawVariant.price || fallback.price || ''),
    dealPrice,
    originalPrice: mrp > 0 && dealPrice > 0 && (mrp > dealPrice || hasExplicitMrp) ? formatPriceDisplay(mrp) : '',
    mrp,
    discount: discountPercent > 0 ? `${discountPercent}% OFF` : (isFlipkartStore && mrp > 0 && dealPrice > 0 ? '0% OFF' : ''),
    discountPercent,
    productUrl,
    link: rawVariant.link || rawVariant.affiliateLink || productUrl,
    affiliateLink: rawVariant.affiliateLink || '',
    affiliateOverrideLink: rawVariant.affiliateOverrideLink || '',
    availability: rawVariant.availability || 'In stock'
  };
};

export const normalizeDealForUi = (deal = {}) => {
  const rawDeal = asPlainObject(deal);
  const pricing = rawDeal.pricing || {};
  const storeInfo = typeof rawDeal.store === 'object' && rawDeal.store !== null ? rawDeal.store : {};
  const media = rawDeal.media || {};
  const productUrl = String(rawDeal.productUrl || rawDeal.originalLink || rawDeal.buyLink || rawDeal.link || rawDeal.url || '').trim();
  const affiliateOverrideLink = String(rawDeal.affiliateOverrideLink || '').trim();
  const affiliateLink = String(rawDeal.affiliateLink || rawDeal.buyLink || '').trim();
  const store = detectStoreName(rawDeal.storeName || storeInfo.name || rawDeal.store, productUrl);
  const isFlipkartStore = String(store || '').toLowerCase().includes('flipkart');
  const rawTitle = pickFirstString(rawDeal.title, rawDeal.rawTitle, rawDeal.originalTitle, rawDeal.name, rawDeal.productTitle, rawDeal.product?.title);
  const titleSet = createProductTitleSet(rawTitle);
  const imageGallery = getProductImageGallery({
    ...rawDeal,
    image: pickImageValue([
      rawDeal.image,
      rawDeal.mainImage,
      media.mainImage,
      media.image
    ]),
    images: Array.isArray(rawDeal.images)
      ? rawDeal.images.map((image) => pickImageValue(image)).filter(Boolean)
      : Array.isArray(media.images)
        ? media.images.map((image) => pickImageValue(image)).filter(Boolean)
        : [],
    store,
    storeName: store,
    productUrl
  });
  const { dealPrice, mrp, discountPercent, hasExplicitMrp } = normalizePricePair({
    dealPriceCandidates: [
      pricing.dealPrice,
      pricing.currentPrice,
      pricing.salePrice,
      rawDeal.dealPrice,
      rawDeal.currentPrice,
      rawDeal.salePrice,
      rawDeal.sellingPrice,
      pricing.price,
      rawDeal.price
    ],
    mrpCandidates: [
      pricing.mrp,
      pricing.originalPrice,
      pricing.listPrice,
      pricing.strikePrice,
      rawDeal.mrp,
      rawDeal.listPrice,
      rawDeal.strikePrice,
      rawDeal.wasPrice,
      rawDeal.originalPrice
    ]
  });

  const normalizedDeal = {
    ...rawDeal,
    title: rawTitle,
    shortTitle: rawDeal.shortTitle || titleSet.cardTitle,
    fullTitle: rawDeal.fullTitle || titleSet.displayTitle,
    slug: rawDeal.slug || slugifyText(rawTitle),
    originalTitle: pickFirstString(rawDeal.originalTitle, rawDeal.rawTitle, titleSet.originalTitle),
    rawTitle: pickFirstString(rawDeal.rawTitle, rawDeal.originalTitle, titleSet.rawTitle),
    displayTitle: pickFirstString(rawDeal.displayTitle, titleSet.displayTitle),
    cardTitle: pickFirstString(rawDeal.cardTitle, titleSet.cardTitle),
    thumbnail: imageGallery[0] || rawDeal.thumbnail || '',
    image: imageGallery[0] || '',
    images: imageGallery,
    store,
    storeName: store,
    storeSlug: rawDeal.storeSlug || slugifyText(store),
    productUrl,
    affiliateOverrideLink,
    affiliateLink,
    link: affiliateLink || productUrl,
    dealPrice,
    price: mrp || dealPrice || 0, // In backend price=MRP
    priceDisplay: dealPrice > 0 ? formatPriceDisplay(dealPrice) : '',
    mrp,
    originalPrice: mrp > 0 ? formatPriceDisplay(mrp) : (dealPrice > 0 ? formatPriceDisplay(dealPrice) : ''),
    discountPercent,
    discount: discountPercent > 0 ? `${discountPercent}% OFF` : (isFlipkartStore && mrp > 0 && dealPrice > 0 ? '0% OFF' : ''),
    categorySlug: rawDeal.categorySlug || slugifyText(rawDeal.category || ''),
    category: pickFirstString(rawDeal.category, rawDeal.categoryName, rawDeal.product?.category, rawDeal.category?.name),
    description: pickFirstString(rawDeal.description, rawDeal.summary, rawDeal.product?.description),
    shortDescription: rawDeal.shortDescription || '',
    brand: rawDeal.brand || '',
    model: rawDeal.model || '',
    specifications: rawDeal.specifications || rawDeal.product?.specifications || {},
    highlights: Array.isArray(rawDeal.highlights) ? rawDeal.highlights : [],
    reviewCount: Number(rawDeal.reviewCount || 0) || 0,
    availability: String(rawDeal.availability || (rawDeal.isExpired ? 'Out of stock' : 'In stock')).trim(),
    isVerified: Boolean(rawDeal.isVerified),
    isTrending: Boolean(rawDeal.isTrending || rawDeal.trending || rawDeal.featured),
    isBestseller: Boolean(rawDeal.isBestseller),
    freshness: rawDeal.freshness || '',
    priceCheckedAt: rawDeal.priceCheckedAt || rawDeal.lastFetchedAt || '',
    publishedAt: rawDeal.publishedAt || rawDeal.createdAt || '',
    lastSyncedAt: rawDeal.lastSyncedAt || rawDeal.updatedAt || rawDeal.lastFetchedAt || '',
    canonicalUrl: rawDeal.canonicalUrl || '',
    createdAt: rawDeal.createdAt || rawDeal.updatedAt || rawDeal.publishedAt || null
  };
  const rawVariants = Array.isArray(rawDeal.variants)
    ? rawDeal.variants
    : [];

  normalizedDeal.variants = rawVariants.length
    ? rawVariants.map((variant, index) => normalizeVariantForUi(variant, normalizedDeal, index))
    : [];
  normalizedDeal.variations = normalizedDeal.variants;

  return normalizedDeal;
};

export const normalizeDealsForUi = (deals = []) =>
  (Array.isArray(deals) ? deals : []).map((deal) => normalizeDealForUi(deal));
