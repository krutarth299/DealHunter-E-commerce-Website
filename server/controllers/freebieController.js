import Freebie from '../models/Freebie.js';
import { logger } from '../utils/logger.js';

export const getFreebies = async (req, res) => {
    try {
        const freebies = await Freebie.find({ status: 'active' }).sort({ createdAt: -1 });
        const types = [...new Set(freebies.map(f => f.type).filter(Boolean))];
        const providers = [...new Set(freebies.map(f => f.provider).filter(Boolean))];
        
        res.json({
            items: freebies,
            types,
            providers
        });
    } catch (error) {
        logger.error('GET_FREEBIES', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getFreebie = async (req, res) => {
    try {
        const freebie = await Freebie.findOne({ slug: req.params.slug });
        if (!freebie) return res.status(404).json({ success: false, message: 'Freebie not found' });
        res.json(freebie);
    } catch (error) {
        logger.error('GET_FREEBIE', error.message, { slug: req.params.slug });
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const saveFreebie = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        
        // Auto-generate slug if not provided
        if (!data.slug && data.title) {
            data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }

        let freebie;
        if (id) {
            freebie = await Freebie.findByIdAndUpdate(id, data, { new: true, runValidators: true });
        } else {
            freebie = await Freebie.create(data);
        }

        res.status(id ? 200 : 201).json(freebie);
    } catch (error) {
        logger.error('SAVE_FREEBIE', error.message, { id: req.params.id });
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'A freebie with this slug already exists.' });
        }
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteFreebie = async (req, res) => {
    try {
        const { id } = req.params;
        const freebie = await Freebie.findByIdAndDelete(id);
        if (!freebie) {
            return res.status(404).json({ success: false, message: 'Freebie not found' });
        }
        res.json({ success: true, message: 'Freebie deleted successfully' });
    } catch (error) {
        logger.error('DELETE_FREEBIE', error.message, { id: req.params.id });
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
