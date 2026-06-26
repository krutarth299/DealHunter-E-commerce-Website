import express from 'express';
import { getFreebies, getFreebie, saveFreebie, deleteFreebie } from '../controllers/freebieController.js';

const router = express.Router();

router.get('/', getFreebies);
router.get('/:slug', getFreebie);

// Admin Routes (Note: In a real app, add auth middleware here)
router.post('/', saveFreebie);
router.put('/:id', saveFreebie);
router.delete('/:id', deleteFreebie);

export default router;
