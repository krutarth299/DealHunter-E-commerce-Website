import mongoose from 'mongoose';

const AffiliateSettingSchema = new mongoose.Schema(
    {
        store: { type: String, required: true, trim: true, unique: true },
        storeSlug: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
        enabled: { type: Boolean, default: false },
        paramKey: { type: String, trim: true, default: '' },
        paramValue: { type: String, trim: true, default: '' },
        urlPattern: { type: String, trim: true, default: '' },
        notes: { type: String, trim: true, default: '' },
        discoveredFromDeals: { type: Boolean, default: true },
        lastSyncedAt: { type: Date }
    },
    {
        timestamps: true
    }
);

export default mongoose.model('AffiliateSetting', AffiliateSettingSchema);
