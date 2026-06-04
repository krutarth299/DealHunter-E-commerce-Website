import mongoose from 'mongoose';

const DealSchema = new mongoose.Schema({
    title: { type: String, required: true },
    shortTitle: { type: String, trim: true, default: '' },
    fullTitle: { type: String, trim: true, default: '' },
    slug: { type: String, trim: true, lowercase: true, index: true },
    originalTitle: { type: String },
    thumbnail: { type: String, trim: true, default: '' },
    image: { type: String, default: '' },
    images: [{ type: String }],
    videos: [{ type: String }],
    price: { type: Number, required: true, default: 0 },
    dealPrice: { type: Number, default: 0 },
    originalPrice: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    discount: { type: String },
    discountPercent: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    availability: { type: String, trim: true, default: '' },
    isVerified: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
    freshness: { type: String, trim: true, default: '' },
    priceCheckedAt: { type: Date },
    publishedAt: { type: Date },
    lastSyncedAt: { type: Date },
    seoTitle: { type: String, trim: true, default: '' },
    seoDescription: { type: String, trim: true, default: '' },
    canonicalUrl: { type: String, trim: true, default: '' },
    shareTitle: { type: String, trim: true, default: '' },
    shareDescription: { type: String, trim: true, default: '' },
    reviews: [{
        user: { type: String, required: true },
        rating: { type: Number, required: true },
        comment: { type: String, required: true },
        date: { type: Date, default: Date.now }
    }],
    store: { type: String, required: true },
    storeName: { type: String },
    storeSlug: { type: String, trim: true, lowercase: true, index: true },
    category: { type: String },
    categorySlug: { type: String, trim: true, lowercase: true, index: true },
    originalLink: { type: String, trim: true, default: '' },
    link: { type: String },
    productUrl: { type: String },
    canonicalProductUrl: { type: String, index: true },
    sourceProductId: { type: String, index: true },
    normalizedTitle: { type: String, index: true },
    duplicateKey: { type: String, index: true },
    variantGroupKey: { type: String, index: true },
    variantLabel: { type: String },
    variantType: { type: String },
    variants: [{
        id: { type: String },
        dealId: { type: String },
        variantKey: { type: String },
        groupKey: { type: String },
        label: { type: String },
        type: { type: String },
        title: { type: String },
        image: { type: String },
        images: [{ type: String }],
        price: { type: Number, default: 0 },
        dealPrice: { type: Number, default: 0 },
        originalPrice: { type: Number, default: 0 },
        mrp: { type: Number, default: 0 },
        discount: { type: String },
        discountPercent: { type: Number, default: 0 },
        productUrl: { type: String },
        link: { type: String },
        affiliateLink: { type: String },
        affiliateOverrideLink: { type: String },
        availability: { type: String },
        sourceProductId: { type: String }
    }],
    validationStatus: { type: String, enum: ['accepted', 'rejected', 'pending'], default: 'accepted', index: true },
    validationErrors: [{ type: String }],
    validationWarnings: [{ type: String }],
    affiliateOverrideLink: { type: String },
    affiliateLink: { type: String },
    description: { type: String },
    shortDescription: { type: String, trim: true, default: '' },
    brand: { type: String, trim: true, default: '' },
    model: { type: String, trim: true, default: '' },
    specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
    highlights: [{ type: String }],
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    isExpired: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date }
});

// No explicit index needed for slug as it is defined on the field
DealSchema.index({ storeSlug: 1, categorySlug: 1, createdAt: -1 });
DealSchema.index({ storeSlug: 1, createdAt: -1 });
DealSchema.index({ categorySlug: 1, createdAt: -1 });
DealSchema.index({ validationStatus: 1, isExpired: 1, createdAt: -1 });
DealSchema.index({ isExpired: 1, createdAt: -1 });
DealSchema.index({ store: 1, createdAt: -1 });
DealSchema.index({ storeName: 1, createdAt: -1 });
DealSchema.index({ category: 1, createdAt: -1 });
DealSchema.index({ discountPercent: -1, createdAt: -1 });
DealSchema.index({ dealPrice: 1, createdAt: -1 });

DealSchema.post('save', function postSavePriceSnapshot(doc) {
    import('../services/pricingInsights.js')
        .then(({ persistPriceSnapshot }) => persistPriceSnapshot(doc))
        .catch((error) => {
            console.warn('[PRICE_SNAPSHOT_WARN]', error.message || error);
        });
});

export default mongoose.model('Deal', DealSchema);
