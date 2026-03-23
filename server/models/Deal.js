import mongoose from 'mongoose';

const DealSchema = new mongoose.Schema({
    title: { type: String, required: true },
    image: { type: String, required: true },
    images: [{ type: String }],
    videos: [{ type: String }],
    price: { type: String, required: true },
    originalPrice: { type: String },
    discount: { type: String },
    rating: { type: Number, default: 0 },
    reviews: [{
        user: { type: String, required: true },
        rating: { type: Number, required: true },
        comment: { type: String, required: true },
        date: { type: Date, default: Date.now }
    }],
    store: { type: String, required: true },
    category: { type: String },
    link: { type: String },
    description: { type: String },
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    isExpired: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Deal', DealSchema);
