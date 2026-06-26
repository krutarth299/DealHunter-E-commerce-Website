import express from 'express';
import { getBlogPosts, getBlogPost, saveBlogPost, deleteBlogPost } from '../controllers/blogController.js';

const router = express.Router();

// Public Routes
router.get('/', getBlogPosts);
router.get('/:slug', getBlogPost);

// Admin Routes (Note: In a real app, add auth middleware here)
router.post('/', saveBlogPost);
router.put('/:id', saveBlogPost);
router.delete('/:id', deleteBlogPost);

export default router;
