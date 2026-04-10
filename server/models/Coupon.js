import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: '' },
        code: { type: String, trim: true, default: '' },
        offerType: {
            type: String,
            enum: ['coupon', 'deal', 'cashback', 'bank', 'app', 'new-user', 'wallet', 'sale'],
            default: 'coupon',
            index: true
        },
        store: { type: String, required: true, trim: true, index: true },
        storeSlug: { type: String, required: true, trim: true, lowercase: true, index: true },
        category: { type: String, trim: true, default: 'Multi-category', index: true },
        affiliateUrl: { type: String, trim: true, default: '' },
        landingUrl: { type: String, trim: true, default: '' },
        cashbackValue: { type: String, trim: true, default: '' },
        discountValue: { type: String, trim: true, default: '' },
        expiryDate: { type: Date, index: true },
        isVerified: { type: Boolean, default: true, index: true },
        verifiedAt: { type: Date, default: Date.now },
        isFeatured: { type: Boolean, default: false, index: true },
        isTrending: { type: Boolean, default: false, index: true },
        status: {
            type: String,
            enum: ['active', 'inactive', 'expired'],
            default: 'active',
            index: true
        },
        terms: { type: String, trim: true, default: '' },
        successRate: { type: Number, default: 0 },
        usageCount: { type: Number, default: 0 },
        popularity: { type: Number, default: 0 },
        sourceUrl: { type: String, trim: true, default: '' },
        sourceType: {
            type: String,
            enum: ['manual', 'html', 'json-ld', 'deal-sync', 'env-source', 'api'],
            default: 'manual',
            index: true
        },
        sourceStoreId: { type: String, trim: true, default: '' },
        duplicateKey: { type: String, trim: true, lowercase: true, index: true },
        normalizedTitle: { type: String, trim: true, lowercase: true, index: true },
        autoFetched: { type: Boolean, default: false, index: true },
        fetchedAt: { type: Date },
        lastSeenAt: { type: Date },
        scanBatchId: { type: String, trim: true, default: '' },
        lastFetchStatus: { type: String, trim: true, default: '' },
        lastFetchError: { type: String, trim: true, default: '' },
        isAppOnly: { type: Boolean, default: false },
        isNewUserOnly: { type: Boolean, default: false },
        bankName: { type: String, trim: true, default: '' },
        paymentMethod: { type: String, trim: true, default: '' },
        reviewStatus: {
            type: String,
            enum: ['approved', 'pending', 'rejected'],
            default: 'approved',
            index: true
        }
    },
    {
        timestamps: true
    }
);

CouponSchema.index({ duplicateKey: 1 }, { unique: true, sparse: true });
CouponSchema.index({ storeSlug: 1, code: 1, title: 1 }, { unique: true });
CouponSchema.index({ status: 1, expiryDate: 1, lastSeenAt: -1 });
CouponSchema.index({ title: 'text', description: 'text', store: 'text', category: 'text' });

export default mongoose.model('Coupon', CouponSchema);
