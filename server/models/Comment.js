import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
    blogSlug: {
        type: String,
        required: true,
        index: true
    },
    userName: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Comment', commentSchema);
