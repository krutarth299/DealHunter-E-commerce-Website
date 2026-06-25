import Blog from '../models/Blog.js';
import logger from '../utils/logger.js';
import { triggerSitemapUpdate } from '../routes/sitemap.js';

/**
 * Get all blog posts
 */
export const getBlogPosts = async (req, res) => {
    try {
        const posts = await Blog.find({ status: 'published' }).sort({ createdAt: -1 });
        const categories = [...new Set(posts.map(p => p.category).filter(Boolean))];
        const tags = [...new Set(posts.flatMap(p => p.tags).filter(Boolean))];
        
        res.json({
            items: posts,
            categories,
            tags
        });
    } catch (error) {
        logger.error('GET_BLOGS', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get single blog post by slug
 */
export const getBlogPost = async (req, res) => {
    try {
        const post = await Blog.findOne({ slug: req.params.slug });
        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
        res.json(post);
    } catch (error) {
        logger.error('GET_BLOG', error.message, { slug: req.params.slug });
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Create/Update blog post (Admin)
 */
export const saveBlogPost = async (req, res) => {
    try {
        const { id } = req.params;
        if (id) {
            const post = await Blog.findByIdAndUpdate(id, req.body, { new: true });
            triggerSitemapUpdate();
            return res.json(post);
        }
        const post = new Blog(req.body);
        await post.save();
        triggerSitemapUpdate();
        res.status(201).json(post);
    } catch (error) {
        logger.error('SAVE_BLOG', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};
