import mongoose from 'mongoose';

const PriceSnapshotSchema = new mongoose.Schema({
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', required: true, index: true },
    duplicateKey: { type: String, index: true },
    variantGroupKey: { type: String, index: true },
    normalizedTitle: { type: String, index: true },
    store: { type: String, index: true },
    category: { type: String, index: true },
    sourceUrl: { type: String },
    currentPrice: { type: Number, required: true },
    originalPrice: { type: Number },
    checkedAt: { type: Date, default: Date.now, index: true },
    metadata: {
        sourceType: { type: String },
        extractionStrategy: { type: String },
        validationStatus: { type: String }
    }
}, {
    timestamps: true
});

PriceSnapshotSchema.index({ dealId: 1, checkedAt: -1 });

export default mongoose.model('PriceSnapshot', PriceSnapshotSchema);
