const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const { blogComments } = require('../mockStore');

// Get comments for a blog post
router.get('/:slug/comments', async (req, res) => {
    try {
        if (req.app.locals.isMockMode) {
            const filtered = blogComments
                .filter(c => c.blogSlug === req.params.slug)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return res.json(filtered);
        }

        const comments = await Comment.find({ blogSlug: req.params.slug }).sort({ createdAt: -1 });
        res.json(comments);
    } catch (err) {
        console.error('Error fetching comments:', err);
        res.status(500).json({ message: 'Error fetching comments' });
    }
});

// Add a comment to a blog post
router.post('/:slug/comments', async (req, res) => {
    try {
        const { userName, text } = req.body;
        if (!userName || !text) {
            return res.status(400).json({ message: 'Name and comment text are required' });
        }

        if (req.app.locals.isMockMode) {
            const newComment = {
                _id: 'mock_' + Date.now(),
                blogSlug: req.params.slug,
                userName,
                text,
                createdAt: new Date()
            };
            blogComments.push(newComment);
            return res.status(201).json(newComment);
        }

        const newComment = new Comment({
            blogSlug: req.params.slug,
            userName,
            text
        });

        const savedComment = await newComment.save();
        res.status(201).json(savedComment);
    } catch (err) {
        console.error('Error saving comment:', err);
        res.status(500).json({ message: 'Error saving comment' });
    }
});

module.exports = router;
