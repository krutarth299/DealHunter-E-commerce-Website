import mongoose from 'mongoose';

const freebieSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    image: {
        type: String,
        trim: true,
        default: ''
    },
    productUrl: {
        type: String,
        required: true,
        trim: true
    },
    provider: {
        type: String,
        trim: true,
        default: ''
    },
    type: {
        type: String,
        enum: ['Software', 'Game', 'Sample', 'Subscription', 'Course', 'Other'],
        default: 'Other'
    },
    value: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        default: null
    },
    seoTitle: {
        type: String,
        trim: true,
        default: ''
    },
    seoDescription: {
        type: String,
        trim: true,
        default: ''
    },
    seoKeywords: {
        type: [String],
        default: []
    },
    status: {
        type: String,
        enum: ['active', 'expired'],
        default: 'active',
        index: true
    },
    featured: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

freebieSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Freebie', freebieSchema);
