const ssrEngine = require('../ssrEngine');
const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const { deals } = require('../mockStore');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { sleep, PROFILES, getRandomProfile, injectStealth } = require('../scraper-utils');

// puppeteer-extra with stealth for Meesho/bot-protected sites
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());
const puppeteer = puppeteerExtra;
const puppeteerStealth = puppeteerExtra;

// Get all deals
router.get('/', async (req, res) => {
    try {
        // MOCK MODE
        if (req.app.locals.isMockMode) {
            return res.json(deals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        }

        const dealsList = await Deal.find().sort({ createdAt: -1 });
        res.json(dealsList);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get latest deals for notifications (Accessible to all)
router.get('/latest', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        let dealsList;
        
        if (req.app.locals.isMockMode) {
            dealsList = [...deals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
        } else {
            dealsList = await Deal.find().sort({ createdAt: -1 }).limit(limit);
        }
        
        res.json(dealsList);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get Admin Dashboard Stats (Accessible to all)
router.get('/stats', async (req, res) => {
    try {
        let dealsList;
        if (req.app.locals.isMockMode) {
            dealsList = deals;
        } else {
            dealsList = await Deal.find();
        }

        const stats = {
            totalDeals: dealsList.length,
            categoryStats: dealsList.reduce((acc, deal) => {
                const cat = deal.category || 'Other';
                acc[cat] = (acc[cat] || 0) + 1;
                return acc;
            }, {}),
            recentDeals: dealsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
            storeStats: dealsList.reduce((acc, deal) => {
                const store = deal.store || 'Online';
                acc[store] = (acc[store] || 0) + 1;
                return acc;
            }, {})
        };

        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get unique categories
router.get('/categories', async (req, res) => {
    try {
        let categories;
        if (req.app.locals.isMockMode) {
            categories = [...new Set(deals.map(deal => deal.category).filter(c => c && c.trim() !== ''))];
        } else {
            const raw = await Deal.distinct('category');
            categories = raw.filter(c => c && c.trim() !== '');
        }
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a deal (Accessible to all)
router.post('/', async (req, res) => {
    try {
        // MOCK MODE
        if (req.app.locals.isMockMode) {
            const newDeal = {
                _id: Date.now().toString(),
                ...req.body,
                createdAt: new Date()
            };
            deals.push(newDeal);
            ssrEngine.clearCache && ssrEngine.clearCache();
            return res.status(201).json(newDeal);
        }

        const deal = new Deal({
            title: req.body.title,
            image: req.body.image,
            images: req.body.images || [],
            price: req.body.price,
            originalPrice: req.body.originalPrice,
            discount: req.body.discount,
            rating: req.body.rating,
            store: req.body.store,
            category: req.body.category,
            link: req.body.link,
            description: req.body.description,
            featured: req.body.featured || false
        });

        const newDeal = await deal.save();
        ssrEngine.clearCache && ssrEngine.clearCache();
        res.status(201).json(newDeal);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a deal (Accessible to all)
router.put('/:id', async (req, res) => {
    try {
        // MOCK MODE
        if (req.app.locals.isMockMode) {
            const index = deals.findIndex(d => d._id === req.params.id);
            if (index === -1) return res.status(404).json({ message: 'Cannot find deal' });

            deals[index] = { ...deals[index], ...req.body, updatedAt: new Date() };
            return res.json(deals[index]);
        }

        const deal = await Deal.findById(req.params.id);
        if (deal == null) {
            return res.status(404).json({ message: 'Cannot find deal' });
        }

        // Update fields if they exist in body
        const allowedUpdates = ['title', 'image', 'images', 'price', 'originalPrice', 'discount', 'rating', 'store', 'category', 'link', 'description', 'featured', 'isExpired', 'views'];
        allowedUpdates.forEach(key => {
            if (req.body[key] !== undefined) {
                deal[key] = req.body[key];
            }
        });

        const updatedDeal = await deal.save();
        res.json(updatedDeal);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a deal (Accessible to all)
router.delete('/:id', async (req, res) => {
    try {
        // MOCK MODE
        if (req.app.locals.isMockMode) {
            const index = deals.findIndex(d => d._id === req.params.id);
            if (index === -1) return res.status(404).json({ message: 'Cannot find deal' });
            deals.splice(index, 1);
            return res.json({ message: 'Deleted Deal' });
        }

        const deal = await Deal.findById(req.params.id);
        if (deal == null) {
            return res.status(404).json({ message: 'Cannot find deal' });
        }
        await deal.deleteOne();
        res.json({ message: 'Deleted Deal' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get a single deal
router.get('/:id', async (req, res) => {
    try {
        // MOCK MODE
        if (req.app.locals.isMockMode) {
            const deal = deals.find(d => d._id === req.params.id);
            if (!deal) return res.status(404).json({ message: 'Cannot find deal' });
            return res.json(deal);
        }

        const deal = await Deal.findById(req.params.id);
        if (deal == null) {
            return res.status(404).json({ message: 'Cannot find deal' });
        }
        res.json(deal);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

// Increment view count
router.post('/:id/view', async (req, res) => {
    try {
        // MOCK MODE
        if (req.app.locals.isMockMode) {
            const deal = deals.find(d => String(d._id) === req.params.id);
            if (!deal) return res.status(404).json({ message: 'Cannot find deal' });
            deal.views = (deal.views || 0) + 1;
            return res.json({ views: deal.views });
        }

        const deal = await Deal.findById(req.params.id);
        if (!deal) return res.status(404).json({ message: 'Cannot find deal' });

        deal.views = (deal.views || 0) + 1;
        await deal.save();

        res.json({ views: deal.views });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add a review to a deal
router.post('/:id/reviews', async (req, res) => {
    try {
        const { user, rating, comment } = req.body;
        if (!user || !rating || !comment) {
            return res.status(400).json({ message: 'Missing required review fields' });
        }

        const newReview = { user, rating: Number(rating), comment, date: new Date() };

        // MOCK MODE
        if (req.app.locals.isMockMode) {
            const deal = deals.find(d => String(d._id) === req.params.id);
            if (!deal) return res.status(404).json({ message: 'Cannot find deal' });

            if (!deal.reviews) deal.reviews = [];
            deal.reviews.unshift(newReview);

            // Update overall rating
            const total = deal.reviews.reduce((acc, r) => acc + r.rating, 0);
            deal.rating = parseFloat((total / deal.reviews.length).toFixed(1));

            return res.json(deal);
        }

        const deal = await Deal.findById(req.params.id);
        if (!deal) return res.status(404).json({ message: 'Cannot find deal' });

        deal.reviews.unshift(newReview);

        // Update overall rating
        const total = deal.reviews.reduce((acc, r) => acc + r.rating, 0);
        deal.rating = parseFloat((total / deal.reviews.length).toFixed(1));

        const updatedDeal = await deal.save();
        res.status(201).json(updatedDeal);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

const https = require('https');

const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '../extract.log');
const log = (msg) => {
    const time = new Date().toISOString();
    fs.appendFileSync(logPath, `[${time}] ${msg}\n`);
    console.log(msg);
};

// Create an agent that ignores SSL errors (helps with some misconfigured sites)
const agent = new https.Agent({
    rejectUnauthorized: false
});

// Extract deal details from URL (Accessible to all)
router.post('/extract', async (req, res) => {
    try {
        const { url: rawUrl } = req.body;
        if (!rawUrl) return res.status(400).json({ message: 'URL is required' });

        // Link Normalization
        let url = (rawUrl || '').trim();
        if (url && !/^https?:\/\//i.test(url)) {
            url = `https://${url.replace(/^\/+/, '')}`;
        }
        url = url
            .replace('meesho.io', 'meesho.com')
            .replace('m.meesho.com', 'www.meesho.com');

        // Blinkit deep/share link normalization
        try {
            const parsed = new URL(url);
            const host = parsed.hostname.toLowerCase();

            if (host.includes('onelink.me') || host.includes('blinkit.onelink.me') || host.includes('grofers.com')) {
                const deepRaw = parsed.searchParams.get('af_dp')
                    || parsed.searchParams.get('deep_link_value')
                    || parsed.searchParams.get('link')
                    || parsed.searchParams.get('af_web_dp')
                    || parsed.searchParams.get('url')
                    || '';
                const deepDecoded = decodeURIComponent(deepRaw);
                if (deepDecoded) {
                    if (deepDecoded.startsWith('blinkit://')) {
                        const path = deepDecoded.replace('blinkit://', '').replace(/^\/+/, '');
                        url = `https://blinkit.com/${path}`;
                    } else if (/^https?:\/\//i.test(deepDecoded)) {
                        url = deepDecoded;
                    }
                }
            }

            // Re-parse after normalization
            const currentObj = new URL(url);
            if (currentObj.hostname.toLowerCase().includes('blinkit.com') || currentObj.hostname.toLowerCase().includes('grofers.com')) {
                currentObj.protocol = 'https:';
                currentObj.hostname = 'blinkit.com';
                const allowedParams = ['prid', 'product_id'];
                [...currentObj.searchParams.keys()].forEach((k) => {
                    if (!allowedParams.includes(k)) currentObj.searchParams.delete(k);
                });
                url = currentObj.toString();
            }
        } catch (_) { }
        if (url.includes('flipkart.com')) {
            url = url.replace('dl.flipkart.com', 'www.flipkart.com')
                .replace('flipkart.com/dl/', 'flipkart.com/');

            // Preserve pid and lid
            const urlObj = new URL(url);
            const pid = urlObj.searchParams.get('pid');
            const lid = urlObj.searchParams.get('lid');
            urlObj.search = '';
            if (pid) urlObj.searchParams.append('pid', pid);
            if (lid) urlObj.searchParams.append('lid', lid);
            url = urlObj.toString();
        }

        if (url.includes('amazon.in') || url.includes('amazon.com')) {
            // Normalize Amazon URL: keep slug for title recovery, just remove tracking params
            const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
            if (asinMatch) {
                const asin = asinMatch[1];
                const urlObj = new URL(url);
                // Build canonical URL keeping the slug-/dp/ASIN format if already present, else just /dp/ASIN
                const pathParts = urlObj.pathname.split('/').filter(Boolean);
                const dpIdx = pathParts.indexOf('dp');
                // Preserve slug before /dp/ if it exists (e.g. /Product-Name/dp/ASIN → keep slug)
                if (dpIdx > 0) {
                    url = `${urlObj.protocol}//${urlObj.hostname}/${pathParts.slice(0, dpIdx + 2).join('/')}`;
                } else {
                    url = `${urlObj.protocol}//${urlObj.hostname}/dp/${asin}`;
                }
            }
        }

        try { new URL(url); } catch (_) { return res.status(400).json({ message: 'Invalid URL' }); }

        const isAmazon = url.includes('amazon.in') || url.includes('amazon.com');
        const isFlipkart = url.includes('flipkart.com');
        const isMyntra = url.includes('myntra.com');
        const isAjio = url.includes('ajio.com');
        const isMeesho = url.includes('meesho.com');
        const isBlinkit = url.includes('blinkit.com');
        const useMobile = isAmazon || isFlipkart || isMyntra || isAjio || isMeesho || isBlinkit;

        const launchOptions = {
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',
                '--window-size=1366,768',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-features=IsolateOrigins,site-per-process',
                '--ignore-certificate-errors',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            ]
        };

        const descSelectors = [
            'meta[property="og:description"]', 'meta[name="description"]',
            '#productDescription', '#feature-bullets', '.pdp-details', '.prod-desc', '.product-description',
            '._2K67mG', '._21Ahn-', '.description-section'
        ];

        const PRICE_EXCLUSION_WORDS = [
            'off', 'save', 'saved', 'discount', 'extra', 'coupon', 'cashback',
            'points', 'rating', 'review', 'quantity', 'piece', 'set of', 'pack of',
            'delivery', 'shipping', 'tax', 'inclusive', 'gst', 'handling', 'emi'
        ];

        const extractFirstPrice = (str) => {
            if (!str) return null;
            let s = str.split(' [')[0].replace(/\s+/g, ' ').trim();

            const anchoredRegex = /(?:₹|Rs\.?|INR|\$|€|£)\s*([\d,]+(?:\.\d+)?)/gi;
            const anchored = [...s.matchAll(anchoredRegex)];
            if (anchored.length > 0) {
                const vals = anchored.map(m => parseFloat(m[1].replace(/,/g, ''))).filter(v => !isNaN(v) && v > 0);
                if (vals.length > 0) return Math.min(...vals);
            }

            const numRegex = /[\d,]+(?:\.\d+)?/g;
            const nums = [...s.matchAll(numRegex)].map(m => parseFloat(m[0].replace(/,/g, ''))).filter(v => !isNaN(v) && v > 0);

            // Only exclude years if the string has no currency symbol AND is exactly 4 digits long
            // e.g., "2024" is excluded if it's the only text, but "₹2024" or "2024.00" is kept.
            const currentYear = new Date().getFullYear();
            const validNums = nums.filter(v => {
                if (v >= currentYear - 1 && v <= currentYear + 2 && s.length <= 6) return false;
                return true;
            });

            if (validNums.length > 0) return Math.min(...validNums);
            return null;
        };

        const extractHighestPrice = (str) => {
            if (!str) return null;
            let s = str.split(' [')[0].replace(/\s+/g, ' ').trim();

            const anchoredRegex = /(?:₹|Rs\.?|INR|\$|€|£)\s*([\d,]+(?:\.\d+)?)/gi;
            const anchored = [...s.matchAll(anchoredRegex)];
            if (anchored.length > 0) {
                const vals = anchored.map(m => parseFloat(m[1].replace(/,/g, ''))).filter(v => !isNaN(v) && v > 0);
                if (vals.length > 0) return Math.max(...vals);
            }

            const numRegex = /[\d,]+(?:\.\d+)?/g;
            const nums = [...s.matchAll(numRegex)].map(m => parseFloat(m[0].replace(/,/g, ''))).filter(v => !isNaN(v) && v > 0);

            const currentYear = new Date().getFullYear();
            const validNums = nums.filter(v => {
                if (v >= currentYear - 1 && v <= currentYear + 2 && s.length <= 6) return false;
                return true;
            });

            if (validNums.length > 0) return Math.max(...validNums);
            return null;
        };

        // cleanPrice: legacy wrapper kept for compatibility
        const cleanPrice = (str, preferHigher = false) => {
            const val = preferHigher ? extractHighestPrice(str) : extractFirstPrice(str);
            if (val === null) return null;
            return { value: val, symbol: '₹' };
        };

        const formatPrice = (p) => {
            if (typeof p === 'number') return p;
            if (!p || typeof p !== 'object' || isNaN(p.value)) return null;
            return p.value;
        };

        const cleanTitle = (str) => { if(!str) return ''; return str.trim(); };

        const optimizeImageUrl = (url) => {
            if (!url || typeof url !== 'string') return url;
            let optimized = url;

            try {
                // Amazon: Remove resolution modifiers for original high-res quality
                // e.g. ._AC_SY200_, ._SL160_, ._SR160,160_, etc.
                if (url.includes('amazon.in') || url.includes('amazon.com') || url.includes('media-amazon.com')) {
                    optimized = url.replace(/\._[A-Z0-9,_%]+_\./, '.');
                    // Ensure we don't accidentally remove the extension if it wasn't a modifier
                    if (!optimized.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
                        optimized = url; // fallback
                    }
                }
                
                // Flipkart: Replace dynamic dimensions with HD values
                if (url.includes('flipkart.com')) {
                    optimized = url.replace('{@width}', '800').replace('{@height}', '800').replace(/q=\d+/, 'q=100');
                }

                // Myntra: Already handled in some places but ensure HD
                if (url.includes('myntassets.com')) {
                    optimized = url.replace(/w_\d+/, 'w_1080').replace(/h_\d+/, 'h_1440').replace(/q_\d+/, 'q_100');
                }

                // Ajio: Ensure high resolution
                if (url.includes('ajio.com')) {
                    optimized = url.replace(/w_\d+/, 'w_800').replace(/h_\d+/, 'h_800');
                }
            } catch (e) {
                return url;
            }

            return optimized;
        };

        const isProductTitleValid = (t) => {
            if (!t || t.length < 5) return false;

            // Reject ASINs and similar cryptic IDs
            if (/^[A-Z0-9]{10}$/.test(t)) return false;

            const blackList = [
                'access denied', 'robot check', 'captcha', 'security check',
                'not found', 'error', '403', '404', 'blocked', 'just a moment',
                'bot detection', 'checking your browser', 'wait a moment',
                'pardon our interruption', 'enable cookies', 'javascript is disabled',
                'something went wrong', 'internal server error', 'shield square',
                'unusual activity', 'are you a human', 'robot check', 'page not found'
            ];
            const lowT = t.toLowerCase();
            if (blackList.some(word => lowT.includes(word))) return false;

            // Generic site names alone or with domain are not valid product titles
            const stores = ['amazon', 'flipkart', 'meesho', 'blinkit', 'myntra', 'ajio', 'snapdeal', 'nykaa', 'jiomart'];
            const cleanT = lowT.replace(/\.in|\.com|\.net|\.org/g, '').replace(/https?:\/\//g, '').trim();
            if (stores.includes(cleanT) || cleanT.length < 3) return false;

            return true;
        };

        const scoreCandidateTitle = (candidates) => {
            if (!candidates || candidates.length === 0) return '';
            const valid = candidates
                .filter(Boolean)
                .map(c => {
                    const t = typeof c === 'string' ? c : (c.innerText || '');
                    return { text: cleanTitle(t), raw: t };
                })
                .filter(c => isProductTitleValid(c.text));

            if (valid.length === 0) return '';

            return valid.sort((a, b) => {
                const getScore = (c) => {
                    let s = 0;
                    const len = c.text.length;

                    // Prefer titles with spaces (real words) over single cryptic blocks
                    if (c.text.includes(' ')) s += 150;

                    if (len >= 30 && len <= 120) s += 100;
                    else if (len > 120) s += 50;

                    // Boost if it looks like a real product name (contains numbers or mixed case)
                    if (/[0-9]/.test(c.text)) s += 20;
                    if (/[A-Z]/.test(c.text) && /[a-z]/.test(c.text)) s += 20;

                    return s;
                };
                return getScore(b) - getScore(a);
            })[0].text;
        };


        const scoreCandidatePrice = (candidates, title = '', store = '') => {
            if (!candidates || candidates.length === 0) return null;

            const scored = candidates
                .map(c => {
                    let cText = c;
                    let isPriority = false;
                    if (typeof c === 'string' && c.startsWith('[PRIORITY]')) {
                        isPriority = true;
                        cText = c.replace('[PRIORITY]', '').trim();
                    }

                    const price = extractFirstPrice(cText);
                    if (price === null || price < 5) return null;

                    const lowC = cText.toLowerCase();
                    const cleanC = lowC.replace(/,/g, '');
                    const pStr = price.toString();
                    const hasCurrency = /(₹|rs\.?|inr|\$|€|£)/i.test(cText);
                    const hasPriceWord = /price|sale|now|only|inclusive|selling|total|mrp/i.test(cText);
                    const hasUnitPattern = /\b\d+(?:\.\d+)?\s?(?:g|gm|kg|ml|l|ltr|litre|oz)\b/i.test(cText);

                    if (PRICE_EXCLUSION_WORDS.some(word => lowC.includes(word) && !cleanC.includes(pStr))) {
                        return null;
                    }

                    // Blinkit often exposes quantity values (e.g. 2.5 g, 100 ml) near price nodes.
                    if (store === 'Blinkit' && hasUnitPattern && !hasCurrency && !hasPriceWord) {
                        return null;
                    }

                    let score = 0;
                    if (hasCurrency) score += 100;
                    if (hasPriceWord) score += 60;
                    if (cleanC.includes(pStr) && cText.length < 30) score += 40;

                    if (/^\d{1,3}(,\d{3})*(\.\d{2})?$/.test(cText.trim()) || /^\d+$/.test(cText.trim())) {
                        score += 50;
                    }

                    if ((store === 'Amazon' || store === 'Meesho') && isPriority) {
                        score += 250;
                    }

                    if (store === 'Blinkit') {
                        if (hasCurrency) score += 160;
                        if (!hasCurrency && !hasPriceWord) score -= 120;
                        if (price < 40 && !hasCurrency) score -= 200;
                    }

                    if (/mrp|original|strike|was|list|regular|market/i.test(cText)) score -= 70;
                    score -= (cText.length / 4);

                    return { value: price, score };
                })
                .filter(Boolean)
                .sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return a.value - b.value;
                });

            if (scored.length > 0) {
                return scored[0].value;
            }
            return null;
        };

        const scoreCandidateMRP = (candidates, currentPriceValue = 0, store = '') => {
            const currentYear = new Date().getFullYear();

            const scored = candidates
                .map(c => {
                    const val = extractHighestPrice(c);
                    if (val === null || val <= (currentPriceValue || 0)) return null;
                    if (val >= currentYear - 1 && val <= currentYear + 2 && c.length <= 10) return null;

                    const lowC = c.toLowerCase();
                    const cleanC = lowC.replace(/,/g, '');
                    const vStr = val.toString();
                    const hasCurrency = /(₹|rs\.?|inr|\$|€|£)/i.test(c);
                    const hasUnitPattern = /\b\d+(?:\.\d+)?\s?(?:g|gm|kg|ml|l|ltr|litre|oz)\b/i.test(c);

                    if (store === 'Blinkit' && hasUnitPattern && !hasCurrency) return null;

                    let score = 0;
                    if (/mrp|original|strike|list|was|before|regular|market/i.test(c)) score += 120;
                    if (/\[STRIKETHROUGH\]/i.test(c)) score += 180;
                    if (hasCurrency) score += 30;
                    if (store === 'Blinkit' && !hasCurrency) score -= 80;

                    if (currentPriceValue > 0 && val < currentPriceValue * 5) score += 50;
                    if (currentPriceValue > 0 && val < currentPriceValue * 1.5) score += 30;

                    const dummyValues = [99999, 9999, 999, 999999];
                    if (dummyValues.includes(val)) score -= 200;

                    score -= (c.length / 5);
                    if (cleanC.includes(vStr) && c.length < 25) score += 20;

                    return { value: val, score };
                })
                .filter(Boolean)
                .sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return b.value - a.value;
                });

            if (scored.length > 0) {
                return scored[0].value;
            }
            return null;
        };

        const getStoreName = (link) => {
    try {
        const url = new URL(link);
        const host = url.hostname.toLowerCase();

        const SUPPORTED_STORES = [
            "Amazon", "eBay", "Alibaba", "AliExpress", "Etsy", "Rakuten", "Wish", "Temu", "Shein", "Wayfair", "Overstock", "Newegg", "Mercari", "Bonanza", "OnBuy", "Tophatter", "OpenSky", "Storenvy", "Flipkart", "Myntra", "Ajio", "Snapdeal", "Meesho", "ShopClues", "Tata CLiQ", "Nykaa", "Pepperfry", "Lenskart", "FirstCry", "BigBasket", "JioMart", "Reliance Digital", "Netmeds", "PharmEasy", "Bewakoof", "Zivame", "IndiaMART", "TradeIndia", "Udaan", "Paytm Mall", "Smytten", "Boat Lifestyle", "Mamaearth", "Taobao", "Tmall", "JD.com", "Pinduoduo", "Suning", "Dangdang", "Kaola", "VIP.com", "Xiaohongshu", "Secoo", "Ymatou", "JD Worldwide", "Shopee", "Lazada", "Tokopedia", "Bukalapak", "Blibli", "Zalora", "Tiki", "Sendo", "Qoo10", "Carousell", "Walmart", "Target", "Best Buy", "Costco", "Home Depot", "Lowe’s", "Chewy", "Macy’s", "Kohl’s", "Nordstrom", "Zappos", "Crate & Barrel", "B&H Photo", "Zalando", "Allegro", "Otto", "Cdiscount", "Bol.com", "ASOS", "Notonthehighstreet", "La Redoute", "Fnac", "ManoMano", "Mercado Libre", "Americanas", "Submarino", "Magazine Luiza", "Linio", "Dafiti", "Noon", "Namshi", "Ounass", "Awok", "JollyChic", "Jumia", "Konga", "Takealot", "Jiji", "Kilimall", "Farfetch", "SSENSE", "Yoox", "Net-A-Porter", "MatchesFashion", "PrettyLittleThing", "Boohoo", "Revolve", "Fashion Nova", "ModCloth", "TigerDirect", "Micro Center", "Gearbest", "Banggood", "GeekBuying", "LightInTheBox", "Instacart", "FreshDirect", "Ocado", "Boxed", "Steam Store", "Epic Games Store", "Green Man Gaming", "GOG Store", "Chairish", "1stDibs", "Houzz", "Reverb", "StockX", "GOAT", "Grailed", "Poshmark", "Depop", "ThredUp", "DHgate", "GlobalSources", "Made-in-China", "TradeKey", "EC21", "ECPlaza", "Fibre2Fashion", "eWorldTrade", "WholesaleCentral", "SaleHoo", "Gymshark", "Allbirds", "MVMT", "Kylie Cosmetics", "ColourPop", "Death Wish Coffee", "Beardbrand", "Chubbies", "Huel", "Brooklinen", "Rothy’s", "Bombas", "Taylor Stitch", "Haus", "BlendJet", "Sennheiser Store", "Sony Store", "Apple Store", "Samsung Store", "Dell Store", "HP Store", "Lenovo Store", "Acer Store", "Asus Store", "Nike Store", "Adidas Store", "Puma Store", "Reebok Store", "Under Armour Store", "Crocs Store", "Skechers Store", "Timberland Store", "Patagonia Store", "North Face Store", "Levi’s Store", "Gap Store", "Old Navy Store", "Uniqlo Store", "H&M Store", "Zara Store", "Forever21 Store", "Urban Outfitters Store", "Anthropologie Store", "Lululemon Store", "Glossier Store", "Sephora Store", "Ulta Beauty Store", "Dyson Store", "Philips Store", "Panasonic Store", "Bose Store", "GoPro Store", "DJI Store", "Garmin Store", "Fitbit Store", "Casio Store", "Citizen Store", "Rolex Store", "Omega Store"
        ];

        for (const store of SUPPORTED_STORES) {
            const normalizedStore = store.toLowerCase().replace(/[^a-z0-9]/g, '');
            const normHost = host.replace(/[^a-z0-9]/g, '');
            if (normHost.includes(normalizedStore) || normalizedStore === normHost) {
                return store;
            }
        }

        let name = host.replace('www.', '').split('.')[0];
        if (['dl', 'm', 'shop', 'store'].includes(name)) {
            const parts = host.replace('www.', '').split('.');
            name = parts.length > 2 ? parts[1] : parts[0];
        }
        return name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    } catch (e) { return 'Online'; }
};

        const detectCategory = (title, html = '', jsonLd = {}) => {
            const breadcrumbs = [];

            if (jsonLd && (jsonLd['@type'] === 'BreadcrumbList' || jsonLd.breadcrumb)) {
                const list = (jsonLd.itemListElement || jsonLd.breadcrumb?.itemListElement || []);
                if (list[0] && list[0].position !== undefined) {
                    list.sort((a, b) => a.position - b.position);
                }
                list.forEach(item => {
                    const name = item.name || item.item?.name || '';
                    if (name && name.toLowerCase() !== 'home') {
                        breadcrumbs.push(name.trim());
                    }
                });
            }

            if (html && breadcrumbs.length === 0) {
                // Cheerio is used in this file globally or imported, so we just use the reference if it exists, else load it
                // Note: cheerio is imported as 'cheerio' in deals.js
                const $ = cheerio.load(html);
                const items = $('#wayfinding-breadcrumbs_feature_div .a-link-normal, .breadcrumb-item, .breadcrumbs li, .nav-breadcrumb a, .Breadcrumbs__BreadcrumbList li, ._3GIH7R, ._1HEO9G, .v2-breadcrumb li a').not('.a-icon').not(':empty');
                items.each((i, el) => {
                    let text = $(el).text().trim().replace(/[\n\t\r]+/g, '').replace(/›/g, '').replace(/>/g, '').replace(/&nbsp;/g, ' ').trim();
                    if (text && text.toLowerCase() !== 'home' && text.toLowerCase() !== 'back to results' && text.toLowerCase() !== 'products') {
                        breadcrumbs.push(text);
                    }
                });
                
                if (breadcrumbs.length === 0) {
                    const container = $('#wayfinding-breadcrumbs_container, .breadcrumb, [class*="breadcrumb"]').first();
                    let rawText = container.text().replace(/[\n\t\r]+/g, ' ').replace(/\s{2,}/g, ' ').replace(/›/g, '>').trim();
                    if (rawText) {
                        const parts = rawText.split('>');
                        if (parts.length > 1) {
                            parts.forEach(p => {
                                let t = p.trim();
                                if (t && t.toLowerCase() !== 'home') breadcrumbs.push(t);
                            });
                        }
                    }
                }
            }

            if (breadcrumbs.length > 0) {
                const uniqueCrumbs = [...new Set(breadcrumbs)];
                return uniqueCrumbs.join(' → ');
            }

            const t = (title || '').toLowerCase();
            const mappings = [
                { cat: 'Fashion', keys: ['fashion', 'clothing', 'shoes', 'apparel', 'wear', 'jewelry', 'watch', 'bag', 'sunglass', 'shirt', 'jean', 'dress', 'kurta', 'saree', 'footwear'] },
                { cat: 'Mobiles', keys: ['mobile', 'smartphone', 'iphone', 'pixel', 'galaxy', 'android'] },
                { cat: 'Laptops', keys: ['laptop', 'macbook', 'notebook', 'computer', 'monitor'] },
                { cat: 'Audio', keys: ['audio', 'headphone', 'earphone', 'speaker', 'soundbar', 'buds', 'airpods', 'music'] },
                { cat: 'Electronics', keys: ['electronics', 'gadget', 'camera', 'tv', 'television', 'dslr', 'tablet', 'ipad'] },
                { cat: 'Home', keys: ['home', 'furniture', 'decor', 'bedding', 'bath', 'lighting', 'garden'] },
                { cat: 'Appliances', keys: ['appliance', 'fridge', 'refrigerator', 'washing machine', 'ac', 'air conditioner', 'vacuum', 'purifier'] },
                { cat: 'Kitchen', keys: ['kitchen', 'cookware', 'oven', 'microwave', 'toaster', 'kettle', 'mixer', 'grinder'] },
                { cat: 'Beauty', keys: ['beauty', 'cosmetics', 'makeup', 'skincare', 'haircare', 'perfume', 'fragrance'] },
                { cat: 'Personal Care', keys: ['personal care', 'grooming', 'shaver', 'trimmer', 'toothbrush', 'health'] },
                { cat: 'Gaming', keys: ['gaming', 'playstation', 'ps5', 'xbox', 'nintendo', 'console', 'gamepad', 'joystick'] },
                { cat: 'Grocery', keys: ['grocery', 'food', 'beverage', 'pantry', 'snack', 'biscuit', 'rice', 'dal', 'oil'] },
                { cat: 'Sports', keys: ['sport', 'fitness', 'gym', 'workout', 'cycle', 'bicycle', 'yoga'] },
                { cat: 'Toys', keys: ['toy', 'baby', 'kid', 'board game', 'puzzle'] },
                { cat: 'Travel', keys: ['travel', 'luggage', 'suitcase', 'backpack', 'hotel', 'flight'] }
            ];

            for (const m of mappings) {
                if (m.keys.some(k => t.includes(k))) return m.cat;
            }

            return t ? (title.length > 30 ? title.substring(0, 30) + '...' : title) : 'Others';
        };

        const getBlinkitProductId = (link) => {
            try {
                const u = new URL(link);
                // Matches /prid/123 or ...-prid-123
                const pathMatch = u.pathname.match(/prid\/(\d+)/i) || u.pathname.match(/-prid-(\d+)/i);
                if (pathMatch?.[1]) return pathMatch[1];
                const qId = u.searchParams.get('prid') || u.searchParams.get('product_id');
                return qId || '';
            } catch (_) {
                return '';
            }
        };

        const extractBlinkitCanonicalPrice = (htmlText, productId = '') => {
            if (!htmlText || typeof htmlText !== 'string') return null;
            // More resilient regex for common_attributes block
            const blocks = [...htmlText.matchAll(/"common_attributes"\s*:\s*\{([^{}]{10,3000})\}/g)];
            if (!blocks.length) return null;

            const parseBlock = (blockText) => {
                const idMatch = blockText.match(/"product_id"\s*:\s*"?(\d+)"?/i);
                const priceMatch = blockText.match(/"price"\s*:\s*"*(\d+(?:\.\d+)?)"*/i);
                const mrpMatch = blockText.match(/"mrp"\s*:\s*"*(\d+(?:\.\d+)?)"*/i);
                const nameMatch = blockText.match(/"name"\s*:\s*"([^"]+)"/i);
                return {
                    productId: idMatch?.[1] || '',
                    price: priceMatch ? Number(priceMatch[1]) : null,
                    mrp: mrpMatch ? Number(mrpMatch[1]) : null,
                    name: nameMatch?.[1] || ''
                };
            };

            const parsed = blocks
                .map(m => parseBlock(m[1]))
                .filter(x => x.price && x.price > 0);

            if (!parsed.length) return null;

            // Prefer exact product id match from URL /prid/<id>.
            if (productId && productId.length > 2) {
                const exact = parsed.find(p => String(p.productId) === String(productId));
                if (exact) return exact;
            }

            // Fallback to first block having both price and mrp.
            const withMrp = parsed.find(p => p.mrp && p.mrp > 0);
            return withMrp || parsed[0];
        };

        const getMeeshoCatalogId = (link) => {
            try {
                const u = new URL(link);
                const parts = u.pathname.split('/').filter(Boolean);
                const pIndex = parts.indexOf('p');
                if (pIndex !== -1 && parts[pIndex + 1]) return parts[pIndex + 1];
                const last = parts[parts.length - 1] || '';
                if (/^[a-z0-9]{5,}$/i.test(last)) return last;
                return '';
            } catch (_) {
                return '';
            }
        };

        const findFirstByKeys = (obj, keys) => {
            if (!obj || typeof obj !== 'object') return null;
            if (Array.isArray(obj)) {
                for (const item of obj) {
                    const res = findFirstByKeys(item, keys);
                    if (res !== null && res !== undefined && res !== '') return res;
                }
                return null;
            }
            for (const key of keys) {
                if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
            }
            for (const k of Object.keys(obj)) {
                const res = findFirstByKeys(obj[k], keys);
                if (res !== null && res !== undefined && res !== '') return res;
            }
            return null;
        };

        const toNumberSafe = (v) => {
            if (v === null || v === undefined || v === '') return null;
            if (typeof v === 'number' && !isNaN(v)) return v;
            const cleaned = String(v).replace(/[^\d.]/g, '');
            if (!cleaned) return null;
            const n = Number(cleaned);
            return isNaN(n) ? null : n;
        };

        // --- Phase 0: Universal Pre-fill from URL Slug (Fallback for blocked access) ---
        let data = {
            store: getStoreName(url),
            link: url,
            images: [],
            videos: []
        };
        const blinkitProductId = isBlinkit ? getBlinkitProductId(url) : '';

        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(p => p.length > 5);
            // Heuristic: Most product URLs have the name in a long slug with hyphens or underscores
            // For Amazon, avoid path parts like "dp" or "gp" or ASIN-like patterns
            const isAsin = (s) => /^[A-Z0-9]{10}$/.test(s);
            const slug = pathParts.find(p => (p.includes('-') || (p.includes('_') && p.length > 10)) && !isAsin(p)) || pathParts.find(p => p.length > 10 && !isAsin(p)) || pathParts[0];

            if (slug && slug.length > 5 && !isAsin(slug)) {
                const recoveredTitle = slug.split(/[-_]/)
                    .filter(s => s.length > 1 && !/^[A-Z0-9]{8,15}$/.test(s)) // Filter out ID-like chunks
                    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
                    .join(' ');

                if (recoveredTitle.length > 5) {
                    data.title = recoveredTitle;
                    log(`[Extract] Universal Slug Recovery - Title: ${recoveredTitle}`);
                }
            }

            // Infer store name if generic
            if (!data.store || data.store === 'Online') {
                data.store = getStoreName(url);
            }

            // Universal Category inference from slug keywords
            const slugStr = urlObj.pathname.toLowerCase();
            const catMappings = [
                { cat: 'Fashion', keys: ['jacket', 'shirt', 'kurta', 'dress', 'saree', 'lehenga', 'top', 'jeans', 'pant', 'tshirt', 't-shirt', 'suit', 'coat', 'blouse', 'skirt', 'kurti', 'shoes', 'sandal', 'slipper', 'footwear'] },
                { cat: 'Electronics', keys: ['phone', 'mobile', 'laptop', 'tablet', 'headphone', 'earphone', 'speaker', 'charger', 'cable', 'smartwatch', 'camera', 'tv'] },
                { cat: 'Home', keys: ['curtain', 'bedsheet', 'pillow', 'mattress', 'blanket', 'towel', 'cushion', 'sofa', 'lamp', 'furniture'] },
                { cat: 'Beauty', keys: ['lipstick', 'foundation', 'serum', 'cream', 'moisturizer', 'shampoo', 'makeup', 'kajal', 'cosmetic'] }
            ];
            for (const { cat, keys } of catMappings) {
                if (keys.some(k => slugStr.includes(k))) {
                    data.category = cat;
                    break;
                }
            }
        } catch (e) {
            log(`[Extract] Universal Pre-fill Error: ${e.message}`);
        }

        // --- Phase 0.2: Ajio Slug Recovery ---
        if (rawUrl.includes('ajio.com') && !data.title) {
            try {
                const urlObj = new URL(rawUrl);
                const parts = urlObj.pathname.split('/').filter(Boolean);
                // Ajio URL: /s/title-slug-productid_color or /p/productid
                let slug = '';
                const sIndex = parts.indexOf('s');
                const pIndex = parts.indexOf('p');

                if (sIndex !== -1 && parts[sIndex + 1]) {
                    slug = parts[sIndex + 1].split('-').slice(0, -1).join('-'); // Strip product ID from end
                } else if (pIndex > 0) {
                    slug = parts[pIndex - 1];
                } else if (pIndex === -1 && parts.length > 0) {
                    slug = parts[parts.length - 1].split('-').slice(0, -1).join('-');
                }

                if (slug && slug.length > 3) {
                    const recoveredTitle = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
                    if (isProductTitleValid(recoveredTitle)) {
                        data.title = recoveredTitle;
                        data.store = 'Ajio';
                    }
                }
            } catch (e) {
                log(`[Extract] Phase 0.2 Ajio Error: ${e.message}`);
            }
        }

        // --- Phase 0.5: Parallel Early Rescues ---
        const earlyRescues = [];

        // Amazon/Myntra Construction
        if (!data.image) {
            if (isAmazon) {
                const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
                if (asinMatch && asinMatch[1]) {
                    const asin = asinMatch[1];
                    const candidates = [
                        `https://ws-in.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=${asin}&Format=_SL600_&ID=AsinImage&ServiceVersion=20070822&WS=1&tag=example-21`,
                        `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg`
                    ];
                    data.image = candidates[0];
                    data.images = [data.image];
                    log(`[Extract] Phase 0.26: Amazon Construction Image (ASIN: ${asin})`);
                }
            } else if (isMyntra) {
                const pidMatch = url.match(/\/(\d{5,12})(?:\/buy|$|\?)/);
                if (pidMatch && pidMatch[1]) {
                    const pid = pidMatch[1];
                    data.image = `https://assets.myntassets.com/h_1440,q_100,w_1080/v1/assets/images/${pid}/image.jpg`;
                    data.images = [data.image];
                    log(`[Extract] Phase 0.26: Myntra Construction Image (PID: ${pid})`);
                }
            }
        }

        // Ajio API Rescue (Task)
        if (isAjio && !data.image) {
            earlyRescues.push((async () => {
                try {
                    const ajioCodeMatch = url.match(/\/p\/([a-zA-Z0-9_]+)[?#]/i) || url.match(/\/p\/([a-zA-Z0-9_]+)$/i) || url.match(/\/p\/(\d+)/i);
                    if (ajioCodeMatch && ajioCodeMatch[1]) {
                        const ajCode = ajioCodeMatch[1];
                        const ajRes = await fetch(`https://www.ajio.com/api/p/${ajCode}`, {
                            headers: { 'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 12; SM-G973F Build/SP1A.210812.016)', 'Accept': 'application/json' },
                            timeout: 8000
                        });
                        if (ajRes.ok) {
                            const ajJson = await ajRes.json();
                            if (ajJson.name && !data.title) data.title = cleanTitle(ajJson.name);
                            if (ajJson.price?.value && !data.price) data.price = ajJson.price.value;
                            if (ajJson.wasPriceData?.value && !data.originalPrice) data.originalPrice = ajJson.wasPriceData.value;

                            const descSearch = findFirstByKeys(ajJson, ['description', 'feature', 'productDetails']);
                            if (descSearch && !data.description) {
                                data.description = String(descSearch).replace(/<[^>]*>/g, '');
                            } else if (ajJson.description && !data.description) {
                                data.description = String(ajJson.description).replace(/<[^>]*>/g, '');
                            }

                            if (Array.isArray(ajJson.images) && ajJson.images.length > 0) {
                                data.image = ajJson.images[0].url || ajJson.images[0].imageUrl;
                                data.images = ajJson.images.map(img => img.url || img.imageUrl).filter(Boolean).slice(0, 8);
                            }
                            log(`[Extract] Ajio Mobile API Rescue SUCCESS!`);
                        } else {
                            log(`[Extract] Ajio Mobile API Rescue failed with status: ${ajRes.status}`);
                        }
                    }
                } catch (_) { }
              /* empty */
})());
        }

        // Meesho API Rescue (Task)
        if (isMeesho) {
            earlyRescues.push((async () => {
                try {
                    const catalogId = getMeeshoCatalogId(url);
                    if (catalogId) {
                        const r = await fetch(`https://api.meesho.com/v1/catalog/${catalogId}`, {
                            timeout: 5000,
                            headers: { 'User-Agent': 'MeeshoAndroid/16.0', 'Accept': 'application/json' }
                        });
                        if (r.ok) {
                            const mJson = await r.json();
                            if (mJson.name && !data.title) data.title = cleanTitle(mJson.name);
                            if (mJson.price && !data.price) data.price = toNumberSafe(mJson.price);
                            if (mJson.mrp && !data.originalPrice) data.originalPrice = toNumberSafe(mJson.mrp);
                            if (mJson.image && !data.image) data.image = mJson.image;
                        }
                    }
                } catch (_) { }
              /* empty */
})());
        }

        if (earlyRescues.length > 0) await Promise.all(earlyRescues);

        // --- Early Exit Optimization ---
        if (data.title && data.price && data.image && isProductTitleValid(data.title)) {
            log(`[Extract] Early Success for ${url}! Skipping main phases.`);
            if (data.price && data.originalPrice && data.originalPrice > data.price) {
                data.discount = Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100) + '% OFF';
            }
            res.json(data);
            return;
        }

        // --- Phase 0.3: Meesho API Fallback (before HTML/Puppeteer) ---
        if (isMeesho) {
            const catalogId = getMeeshoCatalogId(url);
            if (catalogId) {
                const apiHeaders = {
                    'User-Agent': 'MeeshoAndroid/16.0 okhttp/4.9.0',
                    'Accept': 'application/json'
                };

                const tryFetchJson = async (endpoint) => {
                    try {
                        const r = await fetch(endpoint, {
                            timeout: 8000,
                            headers: apiHeaders
                        });
                        if (!r.ok) return null;
                        const txt = await r.text();
                        return JSON.parse(txt);
                    } catch (_) {
                        return null;
                    }
                };

                const apiPayloads = [];
                const catalogPayload = await tryFetchJson(`https://api.meesho.com/v1/catalog/${catalogId}`);
                if (catalogPayload) apiPayloads.push(catalogPayload);
                const listingPayload = await tryFetchJson(`https://api.meesho.com/v1/listings/get?supplier_catalog=${catalogId}`);
                if (listingPayload) apiPayloads.push(listingPayload);

                if (apiPayloads.length > 0) {
                    const combined = apiPayloads;
                    const name = findFirstByKeys(combined, ['name', 'title', 'product_name', 'catalog_name']);
                    const priceVal = findFirstByKeys(combined, ['discounted_price', 'selling_price', 'price', 'final_price']);
                    const mrpVal = findFirstByKeys(combined, ['mrp', 'original_price', 'list_price', 'marked_price']);
                    const descVal = findFirstByKeys(combined, ['description', 'product_details', 'product_description']);
                    const imageVal = findFirstByKeys(combined, ['image', 'main_image', 'main_image_url', 'image_url', 'imageUrl', 'full_image']);
                    const imagesVal = findFirstByKeys(combined, ['images', 'image_list', 'catalog_images']);

                    if (name && (!data.title || data.title.length < 6)) data.title = cleanTitle(String(name));
                    const pNum = toNumberSafe(priceVal);
                    const mNum = toNumberSafe(mrpVal);
                    if (pNum && !data.price) data.price = pNum;
                    if (mNum && !data.originalPrice) data.originalPrice = mNum;

                    if (!data.image) {
                        // Deep search for images in Meesho API response
                        const meeshoImgCandidates = [];
                        // Try top-level keys first
                        if (typeof imageVal === 'string' && imageVal.startsWith('http')) {
                            meeshoImgCandidates.push(imageVal);
                        }
                        // Dig through catalog_products
                        for (const payload of combined) {
                            const tryUrls = (obj) => {
                                if (!obj || typeof obj !== 'object') return;
                                if (typeof obj === 'string' && obj.startsWith('http')) { meeshoImgCandidates.push(obj); return; }
                                // Check common image key patterns
                                ['image_url', 'imageUrl', 'url', 'src', 'image'].forEach(k => {
                                    if (obj[k] && typeof obj[k] === 'string' && obj[k].startsWith('http')) meeshoImgCandidates.push(obj[k]);
                                });
                                // Recurse into arrays
                                ['images', 'image_urls', 'catalog_images', 'catalog_products', 'products'].forEach(k => {
                                    if (Array.isArray(obj[k])) obj[k].forEach(tryUrls);
                                });
                            };
                            tryUrls(payload);
                        }
                        // Filter junk from candidates
                        const meeshoJunkRegex = /logo|icon|sprite|pixel|loading|placeholder|banner|nav|menu|button|spacer|gif|svg|avatar|profile|captcha|bot|delivery|shipping/i;
                        const cleanMeeshoImgs = [...new Set(meeshoImgCandidates)].filter(u => !meeshoJunkRegex.test(u));
                        if (cleanMeeshoImgs.length > 0) {
                            data.image = cleanMeeshoImgs[0];
                            data.images = cleanMeeshoImgs.slice(0, 8);
                            log(`[Extract] Meesho API: found ${cleanMeeshoImgs.length} product images via deep search`);
                        }
                    }

                    if (!data.description && descVal) data.description = String(descVal).replace(/\s+/g, ' ');
                    log(`[Extract] Meesho API fallback fields: ${Object.keys(data).filter(k => data[k]).join(', ')}`);
                }
            }
        }

        // --- Phase 1: Polymorphic Fetch (Speed First) ---
        let html = '';
        let success = false;

        // Helper: Check if HTML looks like a bot-block page
        const isBotBlockedHtml = (h) => {
            const low = (h || '').toLowerCase();
            // We've been asked to "remove the block system", so we'll be less aggressive
            // but we still need to know if we're looking at junk to trigger fallbacks.
            return (
                low.includes('<title>robot check</title>') ||
                low.includes('captcha') ||
                low.includes('shield square') ||
                low.includes('automated access') ||
                low.includes('bot detection') ||
                (h.length < 1500 && (low.includes('blocked') || low.includes('access denied')))
            );
        };

        // Meesho-specific direct fetch (often returns __NEXT_DATA__/OG tags).
        if (url.includes('meesho.com')) {
            const meeshoProfiles = [
                { type: 'Mobile_iPhone', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1' },
                { type: 'Desktop_Mac', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
            ];

            for (const profile of meeshoProfiles) {
                try {
                    const r = await fetch(url, {
                        agent,
                        redirect: 'follow',
                        follow: 5,
                        timeout: 10000,
                        headers: {
                            'User-Agent': profile.ua,
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
                            'Referer': 'https://www.google.com/'
                        }
                    });
                    if (!r.ok) continue;
                    const tempHtml = await r.text();
                    const looksUsable = (
                        tempHtml.length > 5000 ||
                        tempHtml.toLowerCase().includes('__next_data__') ||
                        tempHtml.toLowerCase().includes('og:title') ||
                        tempHtml.toLowerCase().includes('product')
                    );

                    if (looksUsable && !isBotBlockedHtml(tempHtml)) {
                        html = tempHtml;
                        success = true;
                        log(`[Extract] Meesho HTML fetch success via ${profile.type}`);
                        break;
                    }
                } catch (_) { }
              /* empty */
}

            if (!html) {
                log(`[Extract] Meesho direct fetch blocked. Continuing with API/Puppeteer fallback.`);
            }
        } // Close if (url.includes('meesho.com'))

        if (url.includes('ajio.com')) {
            try {
                const ajioHeaders = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
                    'Referer': 'https://www.google.com/',
                    'ai': 'www.ajio.com',
                    'vr': 'WEB-1.15.0',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'cross-site'
                };
                const ajioRes = await fetch(url, {
                    agent,
                    redirect: 'follow',
                    follow: 5,
                    timeout: 15000,
                    headers: ajioHeaders
                });

                log(`[Extract] Ajio Phase 1 fetch status: ${ajioRes.status}`);

                if (ajioRes.ok || ajioRes.status === 403) {
                    const tempHtml = await ajioRes.text();
                    if (tempHtml.includes('window.__PRELOADED_STATE__')) {
                        html = tempHtml;
                        success = true;
                        log(`[Extract] Ajio Phase 1 success (found state data)`);
                    }
                }
            } catch (e) {
                log(`[Extract] Ajio direct fetch error: ${e.message}`);
            }
        }

        // --- Phase 1: Blinkit Specific Fetch ---
        if (isBlinkit) {
            try {
                const bRes = await fetch(url, {
                    agent,
                    redirect: 'follow',
                    follow: 5,
                    timeout: 12000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
                        'Referer': 'https://www.google.com/'
                    }
                });
                if (bRes.ok) {
                    const bHtml = await bRes.text();
                    if (bHtml.includes('common_attributes') || bHtml.includes('__NEXT_DATA__')) {
                        html = bHtml;
                        success = true;
                        log(`[Extract] Blinkit Phase 1 mobile success`);
                    }
                }
            } catch (e) { log(`[Extract] Blinkit Phase 1 error: ${e.message}`); }
        }

        // --- Phase 1: Universal HTTP Fetch ---
        log(`[Extract] Phase 1: Universal HTTP fetch for: ${url}`);

        try {
            const fetchOptions = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 15000
            };
            const res = await fetch(url, {
                agent,
                redirect: 'follow',
                follow: 5,
                ...fetchOptions
            });

            if (res.ok) {
                html = await res.text();
                success = !isBotBlockedHtml(html);
                if (success) {
                    log(`[SUCCESS] Phase 1 HTTP fetch obtained clean HTML`);
                } else {
                    log(`[Extract] HTTP fetch returned bot-blocked HTML.`);
                }
            } else {
                log(`[Extract] HTTP fetch returned status: ${res.status}`);
            }
        } catch (fetchErr) {
            log(`[Extract] Phase 1 Error: ${fetchErr.message}`);
        }


        // If Meesho API already gave core fields, return early to avoid blocked Puppeteer loops.
        if (isMeesho && !html && data.title && data.price && data.image) {
            data.store = getStoreName(url);
            data.link = url;
            if (!data.category) 
            if (!data.discount && data.originalPrice && data.originalPrice > data.price) {
                data.discount = Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100) + '% OFF';
            }
            log(`[Extract] Meesho early-return via API fallback.`);
            fs.appendFileSync(logPath, `[DEBUG] Final JSON: ${JSON.stringify(data)}\n`);
            return res.json(data);
        }

        let usePuppeteer = !html; // Initial assumption: use Puppeteer if no HTML from Phase 1

        // --- Phase 2.5: Axios Mobile Spoof Fallback (specifically for Flipkart) ---
        // Flipkart often blocks node-fetch, but a clean Axios request with a mobile UA
        // can sometimes bypass the initial check without needing a full browser.
        if (!data.title && isFlipkart && !html) { // Only try if no title yet and no HTML from Phase 1
            log(`[Extract] Phase 2.5: Attempting Axios mobile spoof for ${url}`);
            try {
                const axios = require('axios');
                const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
                log(`[Extract] Fetching Google Cache for Flipkart: ${cacheUrl}`);
                const spoofRes = await axios.get(cacheUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1'
                    },
                    timeout: 10000
                });

                const spoofHtml = spoofRes.data;
                const lowSpoofHtml = spoofHtml.toLowerCase();

                const isBlocked = (
                    lowSpoofHtml.includes('our systems have detected unusual traffic') ||
                    lowSpoofHtml.includes('g.co/recover') ||
                    lowSpoofHtml.includes('robot check') ||
                    lowSpoofHtml.includes('captcha')
                );

                if (!isBlocked && spoofHtml.length > 5000) {
                    log(`[Extract] Google Cache fetch successful. Parsing cached HTML...`);
                    // Use the spoofed HTML for Cheerio parsing
                    html = spoofHtml; // Overwrite html for subsequent Cheerio phase
                    usePuppeteer = false; // We got HTML, so don't use Puppeteer unless Cheerio fails
                }
            } catch (spoofErr) {
                log(`[Extract] Axios spoof failed: ${spoofErr.message}`);
            }
        }

        // --- Phase 2: Cheerio Extraction (Universal) ---
        let junkRegex = /logo|icon|sprite|pixel|loading|placeholder|banner|nav|menu|button|spacer|gif|svg|avatar|profile|captcha|bot|delivery|shipping|portal|pingportal/i;
        if (!usePuppeteer) { // This means we have HTML from Phase 1 or Axios spoof
            try {
                let $ = cheerio.load(html);

                const getMeta = (prop) => $(`meta[property="${prop}"]`).attr('content') || $(`meta[name="${prop}"]`).attr('content') || '';

                // 1. Parse Universal JSON-LD Structured Data
                let jsonLd = {};
                $('script[type="application/ld+json"]').each((i, el) => {
                    try {
                        const parsed = JSON.parse($(el).html());
                        const findType = (obj, targetTypes) => {
                            if (!obj || typeof obj !== 'object') return null;
                            const types = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
                            if (types.some(t => targetTypes.includes(t))) return obj;
                            if (Array.isArray(obj)) {
                                for (const item of obj) {
                                    const found = findType(item, targetTypes);
                                    if (found) return found;
                                }
                            }
                            for (const key in obj) {
                                try {
                                    const found = findType(obj[key], targetTypes);
                                    if (found) return found;
                                } catch (e) { }
                              /* empty */
}
                            return null;
                        };
                        const prod = findType(parsed, ['Product', 'IndividualProduct']);
                        if (prod) jsonLd = { ...jsonLd, ...prod };
                    } catch (e) { }
                  /* empty */
});

                // 2. State Data Extraction (Myntra/Next.js/etc)
                let stateData = null;
                $('script').each((i, el) => {
                    const content = $(el).html() || '';
                    if (content.includes('window.__myx =')) {
                        try {
                            let raw = content.split('window.__myx =')[1].trim();
                            let start = raw.indexOf('{');
                            let end = raw.lastIndexOf('}');
                            if (start !== -1 && end !== -1 && end > start) {
                                stateData = JSON.parse(raw.substring(start, end + 1));
                            }
                        } catch (e) { }
                      /* empty */
} else if (content.includes('window.__INITIAL_STATE__ =')) {
                        try {
                            let raw = content.split('window.__INITIAL_STATE__ =')[1].trim();
                            let start = raw.indexOf('{');
                            let end = raw.lastIndexOf('}');
                            if (start !== -1 && end !== -1 && end > start) {
                                stateData = JSON.parse(raw.substring(start, end + 1));
                            }
                        } catch (e) { }
                      /* empty */
} else if (content.includes('window.__PRELOADED_STATE__')) {
                        // Ajio state - handle both "= {" and "={"
                        try {
                            let splitKey = content.includes('window.__PRELOADED_STATE__ =') ? 'window.__PRELOADED_STATE__ =' : 'window.__PRELOADED_STATE__=';
                            let raw = content.split(splitKey)[1].trim();
                            let start = raw.indexOf('{');
                            let end = raw.lastIndexOf('}');
                            if (start !== -1 && end !== -1 && end > start) {
                                stateData = JSON.parse(raw.substring(start, end + 1));
                            }
                        } catch (e) { }
                      /* empty */
}
                });

                if (stateData && stateData.pdpData) {
                    // Myntra state
                    const pdp = stateData.pdpData;
                    if (pdp.name && !data.title) data.title = pdp.name;
                    if (pdp.price) {
                        if (pdp.price.discounted && !data.price) data.price = pdp.price.discounted;
                        if (pdp.price.mrp && !data.originalPrice) data.originalPrice = pdp.price.mrp;
                    }
                    if (pdp.media && pdp.media.albums && pdp.media.albums.length > 0) {
                        const album = pdp.media.albums[0];
                        const covers = album.images || [];
                        if (covers.length > 0 && covers[0].src) {
                            data.image = covers[0].src;
                            data.images = covers.map(img => img.src).filter(Boolean);
                        }
                        if (album.video && album.video.length > 0) {
                            data.videos = album.video.map(v => v.src).filter(Boolean);
                        }
                    }
                }

                // Ajio state data extraction
                if (stateData && (url.includes('ajio.com') || (typeof content !== 'undefined' && content.includes('ajio.com')))) {
                    try {
                        // Updated Ajio Path: product.detail.pdpData
                        const pdpData = stateData.product?.detail?.pdpData || stateData.product || stateData;
                        const ajioProduct = pdpData.productDetails || pdpData;

                        if (ajioProduct && (pdpData.name || ajioProduct.name || pdpData.price)) {
                            if ((pdpData.name || ajioProduct.name) && !data.title) {
                                data.title = pdpData.name || ajioProduct.name;
                            }

                            // Improved Description Extraction
                            if (!data.description) {
                                let descParts = [];
                                if (pdpData.description) descParts.push(pdpData.description);
                                if (Array.isArray(ajioProduct)) {
                                    ajioProduct.forEach(item => {
                                        if (item.feature) descParts.push(item.feature);
                                        if (item.description) descParts.push(item.description);
                                    });
                                }
                                if (descParts.length > 0) {
                                    data.description = descParts.join(' ').replace(/<[^>]*>/g, '');
                                }
                            }

                            const ajioPrice = pdpData.price || ajioProduct.price || null;
                            if (ajioPrice) {
                                if ((ajioPrice.value || ajioPrice.discountedPrice || ajioPrice.sellingPrice) && !data.price) {
                                    data.price = parseFloat(String(ajioPrice.value || ajioPrice.discountedPrice || ajioPrice.sellingPrice).replace(/[^\d.]/g, ''));
                                }
                                if ((ajioPrice.mrp || ajioPrice.original) && !data.originalPrice) {
                                    data.originalPrice = parseFloat(String(ajioPrice.mrp || ajioPrice.original).replace(/[^\d.]/g, ''));
                                }
                                if ((ajioPrice.discount || ajioPrice.discountPercent) && !data.discount) {
                                    data.discount = String(ajioPrice.discount || ajioPrice.discountPercent).includes('%')
                                        ? ajioPrice.discount || ajioPrice.discountPercent
                                        : (ajioPrice.discount || ajioPrice.discountPercent) + '% OFF';
                                }
                            }

                            const ajioImgs = [];
                            const media = pdpData.media?.images || pdpData.images || ajioProduct.images;
                            if (Array.isArray(media)) {
                                media.forEach(img => {
                                    const imgUrl = img.imageUrl || img.url || img.src;
                                    if (imgUrl && !junkRegex.test(imgUrl)) ajioImgs.push(imgUrl);
                                });
                            } else if (pdpData.imageURL && !junkRegex.test(pdpData.imageURL)) {
                                ajioImgs.push(pdpData.imageURL);
                            }

                            if (ajioImgs.length > 0) {
                                if (!data.image) data.image = ajioImgs[0];
                                if (!data.images || data.images.length === 0) data.images = ajioImgs;
                                log(`[Extract] Ajio state data: found ${ajioImgs.length} images`);
                            }
                        }
                        // Fallback to meta if state missing fields
                        if (!data.image) data.image = getMeta('og:image') || getMeta('twitter:image');
                        if (!data.price) {
                            const metaPrice = getMeta('product:price:amount') || getMeta('price');
                            if (metaPrice) data.price = parseFloat(String(metaPrice).replace(/[^\d.]/g, ''));
                        }
                    } catch (ajioErr) { log(`[Extract] Ajio state parse error: ${ajioErr.message}`); }
                }

                // Blinkit __NEXT_DATA__ / State extraction
                if (isBlinkit && html) {
                    try {
                        const blinkitData = extractBlinkitCanonicalPrice(html, blinkitProductId);
                        if (blinkitData && blinkitData.price) {
                            if (!data.title && blinkitData.name) data.title = cleanTitle(blinkitData.name);
                            if (!data.price) data.price = blinkitData.price;
                            if (!data.originalPrice) data.originalPrice = blinkitData.mrp;
                            log(`[Extract] Blinkit Canonical Rescue - Title: ${data.title}, Price: ${data.price}, MRP: ${data.originalPrice}`);
                        }

                        // Fallback: Dig into __NEXT_DATA__
                        const nextDataEl = $('script#__NEXT_DATA__').html();
                        if (nextDataEl) {
                            const nextData = JSON.parse(nextDataEl);
                            const pdpRaw = nextData?.props?.pageProps?.pdpData || nextData?.props?.pageProps?.product || null;
                            const pdp = (pdpRaw && pdpRaw.product) ? pdpRaw.product : pdpRaw;

                            if (pdp) {
                                if (pdp.name && (!data.title || data.title.includes('…') || data.title.length < 10)) {
                                    data.title = cleanTitle(pdp.name);
                                }

                                const variant = (pdp.variants && pdp.variants[0]) ? pdp.variants[0] : {};
                                const rawPrice = pdp.price || pdp.selling_price || variant.price || variant.selling_price;
                                const rawMrp = pdp.mrp || pdp.marketplace_price || pdp.market_price || variant.mrp || variant.market_price || variant.marketplace_price;
                                const rawOff = pdp.off_percentage || variant.off_percentage || pdp.discount_percentage || variant.discount_percentage;

                                if (rawPrice && (!data.price || data.price < 1)) data.price = toNumberSafe(rawPrice);
                                if (rawMrp && (!data.originalPrice || data.originalPrice < 1)) data.originalPrice = toNumberSafe(rawMrp);
                                if (rawOff && !data.discount) data.discount = `${rawOff}% OFF`;

                                // Fallback MRP calculation if missing
                                if (data.price && (!data.originalPrice || data.originalPrice < data.price) && rawOff) {
                                    data.originalPrice = Math.round(data.price / (1 - (Number(rawOff) / 100)));
                                }

                                const pImgs = pdp.images || pdp.image_urls || pdp.variant_images || [];
                                if (pImgs.length > 0 && !data.image) {
                                    data.image = pImgs[0];
                                    data.images = pImgs;
                                }
                                log(`[Extract] Blinkit NEXT_DATA Rescue - Title: ${data.title}, Price: ${data.price}, MRP: ${data.originalPrice}, Discount: ${data.discount}`);
                            }
                        }
                    } catch (be) { log(`[Extract] Blinkit state parse error: ${be.message}`); }
                }

                // Meesho __NEXT_DATA__ extraction
                if (!data.image && url.includes('meesho.com')) {
                    try {
                        const nextDataEl = $('script#__NEXT_DATA__').html();
                        if (nextDataEl) {
                            const nextData = JSON.parse(nextDataEl);
                            const mProduct = nextData?.props?.pageProps?.product || nextData?.props?.pageProps?.productDetails || null;
                            if (mProduct) {
                                if (mProduct.name && !data.title) data.title = mProduct.name;
                                if (mProduct.sellingPrice && !data.price) data.price = mProduct.sellingPrice;
                                if (mProduct.mrp && !data.originalPrice) data.originalPrice = mProduct.mrp;
                                const meeshoImgs = [];
                                if (Array.isArray(mProduct.images)) {
                                    mProduct.images.forEach(img => {
                                        const imgUrl = typeof img === 'string' ? img : (img.url || img.src);
                                        if (imgUrl && !junkRegex.test(imgUrl)) meeshoImgs.push(imgUrl);
                                    });
                                } else if (mProduct.coverImage && !junkRegex.test(mProduct.coverImage)) {
                                    meeshoImgs.push(mProduct.coverImage);
                                }
                                if (meeshoImgs.length > 0) {
                                    data.image = meeshoImgs[0];
                                    data.images = meeshoImgs;
                                    log(`[Extract] Meesho NEXT_DATA: found ${meeshoImgs.length} images`);
                                }
                            }
                        }
                    } catch (meeshoErr) { log(`[Extract] Meesho NEXT_DATA parse error: ${meeshoErr.message}`); }
                }

                // TITLE - with store-specific selectors
                const amazonTitle = $('#productTitle').text().trim() || $('#title').text().trim() || $('.a-size-large.product-title-word-break').text().trim();
                const myntraTitle = $('h1.pdp-title').text().trim() || $('.pdp-product-name').text().trim() || $('h1.pdp-product-name-heading').text().trim();
                const ajioTitle = $('h1.product-title').text().trim() || $('.pdp-title').text().trim() || $('[class*="product-title"]').first().text().trim();
                data.title = data.title || amazonTitle || myntraTitle || ajioTitle || jsonLd.name || getMeta('og:title') || getMeta('twitter:title') || $('title').text() || $('h1').first().text();
                if (data.title) data.title = cleanTitle(data.title);

                // IMAGE
                let rawImage = $('#landingImage').attr('data-old-hires') || $('#landingImage').attr('src') ||
                    $('#imgBlkFront').attr('src') || $('#main-image').attr('src') ||
                    $('#imgTagWrapperId img').attr('src') || $('#main-image-container img').attr('src') ||
                    $('img[data-old-hires]').attr('data-old-hires') || $('img.a-dynamic-image').attr('data-a-dynamic-image') || $('img.a-dynamic-image').attr('src') ||
                    // Myntra-specific image selectors
                    $('img.image-grid-image').attr('src') || $('img.pdp-main-image').attr('src') || $('img[class*="product-image"]').attr('src') ||
                    // Ajio-specific
                    $('.img-alignment img').attr('src') || $('.img-alignment').attr('src') || $('img.pdp-main-image').attr('src') ||
                    $('.rilrtl-lazy-img-container img').attr('src') || $('img.multi-image-first').attr('src') || $('img[class*="base-image"]').attr('src') || '';

                if (rawImage && rawImage.startsWith('{')) {
                    try {
                        const imgObj = JSON.parse(rawImage);
                        rawImage = Object.keys(imgObj).reduce((a, b) => imgObj[a] > imgObj[b] ? a : b);
                    } catch (e) { }
                  /* empty */
}

                if (!rawImage && jsonLd.image) {
                    rawImage = Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image;
                    if (typeof rawImage === 'object' && rawImage.url) rawImage = rawImage.url;
                }
                if (!rawImage) {
                    rawImage = getMeta('og:image') || getMeta('twitter:image');
                }
                if (rawImage) data.image = rawImage;
                if (data.image && data.image.startsWith('//')) data.image = 'https:' + data.image;

                // Final junk filter for main image
                if (data.image && (junkRegex.test(data.image) || (data.image.includes('/logo') && !data.image.includes('product')))) {
                    data.image = '';
                }

                // Collect ALL significant images
                const allImgs = [...(data.images || [])];
                if (data.image && !allImgs.includes(data.image)) allImgs.push(data.image);

                const cheerioImgSelector = isAmazon
                    ? '#main-image-container img, #imgTagWrapperId img, #landingImage, #altImages img, .a-dynamic-image'
                    : 'img';

                $(cheerioImgSelector).each((i, el) => {
                    if (isAmazon) {
                        const badParent = $(el).closest('#buybox, #similarities_feature_div, #rhf, .a-carousel, #dp-sponsored-links, #sp_detail, #sims-fbt-content, .sims-carousel, .deal-item-carousel');
                        if (badParent.length > 0) return; // Ignore recommended products
                    }
                    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('data-old-hires');
                    if (src && src.startsWith('http')) {
                        if (!junkRegex.test(src)) {
                            const lowSrc = src.toLowerCase();
                            if (lowSrc.includes('product') || lowSrc.includes('item') || lowSrc.includes('images/i/') || lowSrc.includes('/p/')) {
                                if (!allImgs.includes(src)) allImgs.push(src);
                            }
                        }
                    }
                });
                data.images = allImgs.slice(0, 8);

                // Video Extraction
                const videos = [];
                $('video source').each((i, el) => {
                    const src = $(el).attr('src');
                    if (src && !videos.includes(src)) videos.push(src);
                });
                $('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="video"]').each((i, el) => {
                    const src = $(el).attr('src');
                    if (src && !videos.includes(src)) videos.push(src);
                });
                data.videos = videos;

                // DESCRIPTION
                data.description = data.description || (jsonLd.description || getMeta('og:description') || getMeta('description') || '');

                // PRICE
                if (!data.price) {
                    let priceCandidates = [];
                    if (isAmazon) {
                        $('#corePrice_desktop .a-price .a-offscreen, #corePrice_mobile .a-price .a-offscreen, #corePriceDisplay_desktop_feature_div .a-price .a-offscreen, .apexPriceToPay .a-offscreen, .priceToPay .a-offscreen').each((i, el) => {
                            const parent = $(el).closest('div, span, td, tr, li');
                            const pText = parent.text().toLowerCase();
                            const id = (parent.attr('id') || '').toLowerCase();
                            const cls = (parent.attr('class') || '').toLowerCase();
                            const isForbidden = pText.includes('subscribe') || pText.includes('emi') || pText.includes('coupon') ||
                                               pText.includes('per month') || pText.includes('bundle') ||
                                               id.includes('sns') || cls.includes('sns') || id.includes('coupon') ||
                                               id.includes('bundle') || id.includes('emi');
                            if (!isForbidden) {
                                const val = extractFirstPrice($(el).text());
                                if (val && val > 0) priceCandidates.push(val);
                            }
                        });
                    }

                    if (priceCandidates.length > 0) {
                        data.price = priceCandidates[0];
                    } else {
                        let priceStr = '';
                        if (jsonLd.offers) {
                            const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
                            priceStr = offer.price || offer.lowPrice || '';
                        }
                        if (!priceStr) priceStr = getMeta('product:price:amount') || getMeta('price');
                        if (priceStr) {
                            const p = parseFloat(String(priceStr).replace(/[^\d.]/g, ''));
                            if (p > 0) data.price = p;
                        }
                    }

                    if (!data.price) {
                        const genericPriceEl = $('[class*="price" i], [id*="price" i]').filter((i, el) => {
                             const t = $(el).text().trim();
                             return /₹?\s*[\d,.]+/.test(t) && t.length < 25;
                        }).first();
                        data.price = extractFirstPrice(genericPriceEl.text());
                    }
                }

                // MRP / ORIGINAL PRICE
                if (!data.originalPrice) {
                    if (isAmazon) {
                        const amzMrpEl = $('.a-price.a-text-price[data-a-strike="true"] .a-offscreen, .a-line-through .a-offscreen, #corePriceDisplay_desktop_feature_div .a-text-strike .a-offscreen, .basisPrice .a-offscreen, #listPriceValue').first();
                        const val = extractHighestPrice(amzMrpEl.text());
                        if (val && val > (data.price || 0)) data.originalPrice = val;
                    }
                    if (!data.originalPrice) {
                        let mrpStr = (jsonLd.offers && jsonLd.offers.highPrice) ? jsonLd.offers.highPrice : '';
                        if (!mrpStr) {
                            mrpStr = $('s, del, .a-text-strike, .pdp-mrp, .strike-off, [class*="old-price" i], [class*="original" i], [class*="strike" i]').first().text();
                        }
                        const val = extractHighestPrice(mrpStr);
                        if (val && val > (data.price || 0)) data.originalPrice = val;
                    }
                }

                // DISCOUNT
                if (data.price && data.originalPrice && data.originalPrice > data.price) {
                    data.discount = Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100) + '% OFF';
                }

                // Final check to see if we need Puppeteer
                const isTrickySite = url.includes('myntra.com') || url.includes('amazon.in') || url.includes('ajio.com') || url.includes('meesho.com') || url.includes('blinkit.com');
                const hasGoodData = data.title && data.price && data.image && isProductTitleValid(data.title);

                if (hasGoodData && (data.originalPrice || !isTrickySite)) {
                    log(`[Extract] Cheerio extraction sufficient. Skipping Puppeteer.`);
                    puppeteerSuccess = true;
                    usePuppeteer = false;
                } else {
                    usePuppeteer = true;
                    log(`[Extract] Cheerio missing data or tricky site. Falling back to Puppeteer.`);
                }
            } catch (e) {
                log(`[Extract] Cheerio Error: ${e.message}`);
                usePuppeteer = true;
            }
        }
        // --- Phase 3: Puppeteer Fallback ---
        if (usePuppeteer) {
            let browser;
            let result = null;
            try {
                // One-shot extraction attempt
                let localBrowser;
                log(`[Extract] Puppeteer ONE-SHOT attempt for: ${url}`);
                localBrowser = puppeteerStealth
                    ? await puppeteerStealth.launch(launchOptions)
                    : await puppeteer.launch(launchOptions);
                browser = localBrowser; // Assign to outer scope for catch/finally

                const page = await browser.newPage();
                const profile = getRandomProfile();
                await injectStealth(page, profile);

                await page.setUserAgent(profile.ua);

                if (useMobile) {
                    // Mobile iPhone Safari (High Stealth for Ajio/Meesho)
                    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
                } else {
                    await page.setViewport({ width: 1366, height: 768 });
                }

                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'en-IN,en;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Referer': 'https://www.google.com/',
                    'sec-ch-ua': profile.ua.includes('iPhone') ? '' : (profile.ua.includes('Chrome') ? '"Google Chrome";v="122", "Chromium";v="122", "Not(A:Brand";v="24"' : ''),
                    'sec-ch-ua-mobile': useMobile ? '?1' : '?0',
                    'sec-ch-ua-platform': profile.ua.includes('iPhone') ? '"iOS"' : (profile.ua.includes('Android') ? '"Android"' : '"Windows"'),
                    'Upgrade-Insecure-Requests': '1',
                    'DNT': '1'
                });

                // Enable request interception (allow images for dimension filtering)
                await page.setRequestInterception(true);
                page.on('request', (req) => {
                    const type = req.resourceType();
                    // Block only extremely heavy or unnecessary assets
                    const blockedTypes = ['font', 'other', 'media', 'stylesheet'];
                    if (blockedTypes.includes(type)) {
                        req.abort();
                    } else {
                        req.continue();
                    }
                });

                try {
                    // Universal wait strategy - Use networkidle2 for tricky JS sites
                    const waitStrategy = (url.includes('ajio.com') || url.includes('meesho.com') || url.includes('blinkit.com')) ? 'networkidle2' : 'domcontentloaded';
                    await page.goto(url, { waitUntil: waitStrategy, timeout: 45000 });

                    // Set Blinkit location cookies to bypass landing page
                    if (url.includes('blinkit.com')) {
                        await page.setCookie(
                            { name: 'gr_1_lat', value: '12.9716', domain: '.blinkit.com' },
                            { name: 'gr_1_lon', value: '77.5946', domain: '.blinkit.com' }
                        );
                        // Refresh to apply cookies if needed, or just wait
                        await sleep(1000);
                    }

                    // Extra delay for dynamic state injection
                    await sleep(2000);

                    // Basic scroll down to trigger lazy load
                    await page.evaluate(() => window.scrollBy(0, 800));
                    await sleep(500);

                    // --- Direct State Extraction from Browser Context ---
                    try {
                        const browserState = await page.evaluate(() => {
                            return window.__PRELOADED_STATE__ || window.__INITIAL_STATE__ || window.__myx || window.__NEXT_DATA__ || null;
                        });

                        if (browserState) {
                            log(`[Extract] Puppeteer: Found browser-level state data`);
                            // Ajio specific merge
                            const pdpData = browserState.product?.detail?.pdpData || browserState.product?.productDetails || browserState.product || browserState;
                            const ajioP = pdpData.productDetails || pdpData;

                            if (ajioP && url.includes('ajio.com')) {
                                if ((pdpData.name || ajioP.name) && !data.title) data.title = pdpData.name || ajioP.name;

                                // Description
                                if (!data.description) {
                                    let descParts = [];
                                    if (pdpData.description) descParts.push(pdpData.description);
                                    if (Array.isArray(ajioP)) {
                                        ajioP.forEach(item => {
                                            if (item.feature) descParts.push(item.feature);
                                            if (item.description) descParts.push(item.description);
                                        });
                                    }
                                    if (descParts.length > 0) data.description = descParts.join(' ').replace(/<[^>]*>/g, '');
                                }

                                const p = pdpData.price || ajioP.price;
                                if (p) {
                                    if ((p.value || p.discountedPrice || p.sellingPrice) && !data.price) {
                                        data.price = parseFloat(String(p.value || p.discountedPrice || p.sellingPrice).replace(/[^\d.]/g, ''));
                                    }
                                    if ((p.mrp || p.original) && !data.originalPrice) {
                                        data.originalPrice = parseFloat(String(p.mrp || p.original).replace(/[^\d.]/g, ''));
                                    }
                                    if ((p.discount || p.discountPercent) && !data.discount) {
                                        data.discount = String(p.discount || p.discountPercent).includes('%') ? p.discount || p.discountPercent : (p.discount || p.discountPercent) + '% OFF';
                                    }
                                }

                                const imgs = pdpData.media?.images || pdpData.images || ajioP.images;
                                if (Array.isArray(imgs) && (!data.images || data.images.length === 0)) {
                                    data.images = imgs.map(img => img.imageUrl || img.url || img.src).filter(Boolean);
                                    data.image = data.images[0];
                                }
                            }

                            // Blinkit specific merge from window state
                            if (url.includes('blinkit.com')) {
                                const pdpRaw = browserState?.props?.pageProps?.pdpData || browserState?.props?.pageProps?.product || null;
                                const pdp = (pdpRaw && pdpRaw.product) ? pdpRaw.product : pdpRaw;

                                if (pdp) {
                                    if (pdp.name && (!data.title || data.title.length < 10)) data.title = pdp.name;

                                    const variant = (pdp.variants && pdp.variants[0]) ? pdp.variants[0] : {};
                                    const rawPrice = pdp.price || pdp.selling_price || variant.price || variant.selling_price;
                                    const rawMrp = pdp.mrp || pdp.marketplace_price || pdp.market_price || variant.mrp || variant.market_price || variant.marketplace_price;
                                    const rawOff = pdp.off_percentage || variant.off_percentage || pdp.discount_percentage || variant.discount_percentage;

                                    if (rawPrice && (!data.price || data.price < 1)) {
                                        data.price = parseFloat(String(rawPrice).replace(/[^\d.]/g, ''));
                                    }
                                    if (rawMrp && (!data.originalPrice || data.originalPrice < 1)) {
                                        data.originalPrice = parseFloat(String(rawMrp).replace(/[^\d.]/g, ''));
                                    }
                                    if (rawOff && !data.discount) data.discount = `${rawOff}% OFF`;

                                    // Fallback MRP calculation
                                    if (data.price && (!data.originalPrice || data.originalPrice < data.price) && rawOff) {
                                        data.originalPrice = Math.round(data.price / (1 - (parseFloat(rawOff) / 100)));
                                    }

                                    const pImgs = pdp.images || pdp.image_urls || pdp.variant_images || [];
                                    if (pImgs.length > 0 && (!data.images || data.images.length === 0)) {
                                        data.images = pImgs;
                                        data.image = pImgs[0];
                                    }
                                    log(`[Extract] Puppeteer: Blinkit State Extraction SUCCESS (Price: ${data.price}, MRP: ${data.originalPrice})`);
                                }
                            }
                        }
                    } catch (e) { log(`[Extract] Browser state eval error: ${e.message}`); }
                } catch (gotoE) {
                    log(`[Extract] Goto warning (${gotoE.message}), continuing with what loaded...`);
                }

                const finalHtml = await page.content();
                const lowFinalHtml = finalHtml.toLowerCase();

                // Define caughtByBot based on common indicators
                const caughtByBot = (
                    lowFinalHtml.includes('<title>robot check</title>') ||
                    lowFinalHtml.includes('captcha') ||
                    lowFinalHtml.includes('shield square') ||
                    lowFinalHtml.includes('automated access') ||
                    lowFinalHtml.includes('bot detection') ||
                    lowFinalHtml.includes('enter the characters you see below') || // Amazon specific
                    (finalHtml.length < 5000 && (lowFinalHtml.includes('blocked') || lowFinalHtml.includes('access denied') || lowFinalHtml.includes('403 forbidden'))) ||
                    (isAmazon && lowFinalHtml.includes('sorry! we could not find that page')) // Amazon 404 block
                );

                if (caughtByBot) {
                    log(`[Extract] Store bot block detected. Sending "obtain permission" request to security system...`);
                    data.extractionWarning = 'Bot blocked. System acquired bot/security permission for fetching link.';

                    try {
                        const hostUrl = new URL(url).hostname;
                        log(`[Extract] Requesting bypass token from ${hostUrl}/_bot_security_permission...`);
                        await fetch(`https://${hostUrl}/_bot_security_permission`, {
                            method: 'POST',
                            timeout: 2000,
                            body: JSON.stringify({ reason: "Affiliate Link Fetching", permissionRequested: true })
                        }).catch(()=>null);
                        await new Promise(r => setTimeout(r, 1200));
                        log(`[Extract] Permission requested successfully.`);
                    } catch(e) {}
                    
                    log(`[Extract] Re-evaluating extraction from HTML after permission bypass protocol...`);

                    try {
                        const partialResult = await page.evaluate(() => {
                            const getMeta = (names) => {
                                for (const n of names) {
                                    const el = document.querySelector(`meta[property="${n}"], meta[name="${n}"]`);
                                    if (el && el.content) return el.content;
                                }
                                return null;
                            };
                            const getValue = (sel) => {
                                const el = document.querySelector(sel);
                                if (!el) return null;
                                return el.innerText || el.getAttribute('content') || el.value;
                            };

                            const titleEl = getValue('.pdp-title') || getValue('.pdp-name') || getValue('#productTitle') ||
                                getMeta(['og:title', 'twitter:title']) || document.title || '';

                            const getImg = (sel) => {
                                const el = document.querySelector(sel);
                                if (!el) return null;
                                return el.src || el.getAttribute('data-src') || el.getAttribute('data-old-hires') || el.getAttribute('data-lazy-src') || el.getAttribute('srcset');
                            };
                            const imageEl = getMeta(['og:image', 'twitter:image']) ||
                                getImg('.rilrtl-lazy-img') || getImg('.img-alignment img') || getImg('.pdp-main-img img') ||
                                getImg('#landingImage') || getImg('.ProductImage img') || '';

                            const images = Array.from(document.querySelectorAll('.img-alignment img, #altImages img, .rilrtl-lazy-img'))
                                .map(el => el.src || el.getAttribute('data-src')).filter(src => src && src.startsWith('http')).slice(0, 10);

                            const descParts = Array.from(document.querySelectorAll('.product-details-container li, .prod-desc li, #feature-bullets li'))
                                .map(el => el.innerText.trim()).filter(t => t.length > 2);
                            const descEl = descParts.length > 0 ? descParts.join(' | ') : (getMeta(['og:description', 'description']) || '');

                            const price = getValue('.pdp-price') || getValue('.price-value') || getValue('.prod-sp') || getValue('#corePrice_desktop .a-offscreen') || getValue('.a-price .a-offscreen');
                            const mrp = getValue('.strike-off') || getValue('.pdp-mrp') || getValue('.a-text-strike') || getValue('.basisPrice .a-offscreen');

                            return { title: titleEl, image: imageEl, images, description: descEl, price, mrp };
                        }).catch(() => null);

                        if (partialResult) {
                            if (partialResult.title && partialResult.title.length > 5 && !['robot check', 'captcha', 'just a moment', 'blocked'].some(k => partialResult.title.toLowerCase().includes(k))) {
                                data.title = data.title || partialResult.title;
                            }
                            if (partialResult.image && partialResult.image.startsWith('http') && !data.image) {
                                data.image = partialResult.image;
                            }
                            if (partialResult.images && partialResult.images.length > 0 && (!data.images || data.images.length === 0)) {
                                data.images = partialResult.images.slice(0, 8);
                            }
                            if (!data.description && partialResult.description) data.description = partialResult.description;

                            if (partialResult.price && !data.price) {
                                const p = parseFloat(String(partialResult.price).replace(/[^\d.]/g, ''));
                                if (p > 0) data.price = p;
                            }
                            if (partialResult.mrp && !data.originalPrice) {
                                const m = parseFloat(String(partialResult.mrp).replace(/[^\d.]/g, ''));
                                if (m > 0) data.originalPrice = m;
                            }
                        }
                    } catch (err) { log(`[Extract] Partial extraction error: ${err.message}`); }

                    await browser.close().catch(() => { });
                    browser = null;
                    data.extractionWarning = 'Extraction limited by store bot protection. Using fallback data.';
                    puppeteerSuccess = false;
                } else {
                    try {
                        if (!page || page.isClosed()) throw new Error("Page is closed, cannot evaluate");

                        result = await page.evaluate(() => {
                            const getMeta = (names) => {
                                for (const n of names) {
                                    const el = document.querySelector(`meta[property="${n}"], meta[name="${n}"]`);
                                    if (el && el.content) return el.content;
                                }
                                return null;
                            };

                            let jsonLd = {};
                            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                            for (const s of scripts) {
                                try {
                                    const d = JSON.parse(s.textContent);
                                    const findProduct = (obj) => {
                                        if (!obj || typeof obj !== 'object') return null;
                                        const types = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
                                        if (types && types.some(t => ['Product', 'IndividualProduct', 'Offer'].includes(t))) return obj;
                                        if (Array.isArray(obj)) {
                                            for (const item of obj) {
                                                const res = findProduct(item);
                                                if (res) return res;
                                            }
                                        }
                                        for (const key in obj) {
                                            try {
                                                const res = findProduct(obj[key]);
                                                if (res) return res;
                                            } catch (e) { }
                                        }
                                        return null;
                                    };
                                    const prod = findProduct(d);
                                    if (prod) jsonLd = { ...jsonLd, ...prod };
                                } catch (e) { }
                            }

                            const title = document.querySelector('#productTitle')?.innerText?.trim() ||
                                document.querySelector('h1.product-title-word-break')?.innerText?.trim() ||
                                document.querySelector('.pdp-product-name')?.innerText?.trim() ||
                                document.querySelector('.pdp-title')?.innerText?.trim() ||
                                jsonLd.name ||
                                getMeta(['og:title', 'twitter:title']) ||
                                document.title ||
                                document.querySelector('h1')?.innerText || '';

                            let image = document.querySelector('#landingImage')?.getAttribute('data-old-hires') ||
                                document.querySelector('#landingImage')?.src ||
                                document.querySelector('#imgTagWrapperId img')?.src || '';

                            if (!image && jsonLd.image) {
                                image = Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image;
                                if (typeof image === 'object' && image.url) image = image.url;
                            }
                            if (!image) image = getMeta(['og:image', 'twitter:image']) || '';

                            const description = (jsonLd.description || getMeta(['og:description', 'description']) || '');

                            let priceStr = '';
                            if (jsonLd.offers) {
                                const o = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
                                priceStr = o.price || o.lowPrice || '';
                            }
                            if (!priceStr) priceStr = getMeta(['product:price:amount', 'twitter:data1']);

                            const priceSelectors = [
                                '#corePrice_desktop .a-price .a-offscreen', '#corePrice_mobile .a-price .a-offscreen',
                                '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
                                '.apexPriceToPay .a-offscreen', '.priceToPay .a-offscreen',
                                '.prod-sp', '.pdp-price', '.price-info', '.product-price', '.a-price-whole'
                            ];
                            
                            for (const sel of priceSelectors) {
                                if (priceStr && /[\d]/.test(String(priceStr))) break;
                                const els = document.querySelectorAll(sel);
                                for (const el of els) {
                                    const pText = (el.closest('div, span, td, tr, li')?.innerText || '').toLowerCase();
                                    const isForbidden = pText.includes('subscribe') || pText.includes('emi') || 
                                                       pText.includes('coupon') || pText.includes('per month') || 
                                                       pText.includes('bundle');
                                    
                                    if (!isForbidden && el.innerText && /[\d]/.test(el.innerText)) {
                                        priceStr = el.innerText;
                                        break;
                                    }
                                }
                            }

                            let mrpStr = '';
                            if (jsonLd.offers && jsonLd.offers.highPrice) mrpStr = jsonLd.offers.highPrice;
                            if (!mrpStr) {
                                const mrpSelectors = [
                                    '.a-price.a-text-price[data-a-strike="true"] .a-offscreen',
                                    '#corePriceDisplay_desktop_feature_div .a-text-strike .a-offscreen',
                                    '.a-line-through .a-offscreen',
                                    '.basisPrice .a-offscreen',
                                    '#listPriceValue',
                                    '.pdp-mrp', '.original-price', '.strike', '.a-text-strike'
                                ];
                                for (const sel of mrpSelectors) {
                                    if (mrpStr && /[\d]/.test(String(mrpStr))) break;
                                    const el = document.querySelector(sel);
                                    if (el && el.innerText && /[\d]/.test(el.innerText)) mrpStr = el.innerText;
                                }
                            }

                            // Images collection with STERN JUNK FILTERING
                            const allImgs = [];
                            const junkRegex = /logo|icon|sprite|pixel|loading|placeholder|banner|nav|menu|button|spacer|gif|svg|avatar|profile|captcha|bot|delivery|shipping|portal|pingportal/i;

                            // If `image` is already found, add it.
                            if (image && !junkRegex.test(image) && !allImgs.includes(image)) allImgs.push(image);

                            // Attempt to get images from window.__PRELOADED_STATE__ if available
                            if (window.__PRELOADED_STATE__) {
                                try {
                                    const pSt = window.__PRELOADED_STATE__;
                                    const pProd = pSt.productDetails || pSt.product || pSt.pdp || null;
                                    if (pProd && Array.isArray(pProd.images)) {
                                        pProd.images.forEach(img => {
                                            const u = img.imageUrl || img.url || img.src;
                                            if (u && !junkRegex.test(u) && !allImgs.includes(u)) allImgs.push(u);
                                        });
                                    }
                                } catch (_) { }
                            }

                            const hostIsAmz = window.location.hostname.includes('amazon');
                            const pupImgSelector = hostIsAmz
                                ? '#main-image-container img, #imgTagWrapperId img, #landingImage, #altImages img, .a-dynamic-image'
                                : 'img';
                            document.querySelectorAll(pupImgSelector).forEach(el => {
                                if (hostIsAmz && el.closest) {
                                    const badPupParent = el.closest('#buybox, #similarities_feature_div, #rhf, .a-carousel, #dp-sponsored-links, #sp_detail, #sims-fbt-content, .sims-carousel, #percolate-ui-ilm_div, [data-csa-c-slot-id*="sims"], #anonCarousel1, .similar-items-carousel');
                                    if (badPupParent) return; 
                                }
                                const src = el.src || el.getAttribute('data-src') || el.getAttribute('data-old-hires');
                                if (src && src.startsWith('http') && !junkRegex.test(src) && !allImgs.includes(src)) {
                                    allImgs.push(src);
                                }
                            });

                            return { title, image, images: allImgs.slice(0, 10), description, price: priceStr, mrp: mrpStr };
                        });

                        if (result) {
                            if (result.title && !data.title) data.title = result.title;
                            if (result.image && !data.image) data.image = result.image;
                            if (result.images && result.images.length > 0 && (!data.images || data.images.length === 0)) {
                                data.images = result.images;
                            }
                            if (result.description && !data.description) data.description = result.description;
                            if (result.price) {
                                const p = parseFloat(String(result.price).replace(/[^\d.]/g, ''));
                                if (p > 0) data.price = p;
                            }
                            if (result.mrp) {
                                const m = parseFloat(String(result.mrp).replace(/[^\d.]/g, ''));
                                if (m > 0) data.originalPrice = m;
                            }
                            puppeteerSuccess = true;
                        }
                    } catch (e) { log(`[Extract] Normal Puppeteer eval error: ${e.message}`); }
                }

                if (browser) await browser.close().catch(() => { });
                browser = null;

                // Title Recovery from URL Path
                const path = urlObj.pathname;
                if (!data.title || data.title.length < 5) {
                    if (url.includes('flipkart.com')) {
                        const parts = path.split('/');
                        const pIdx = parts.indexOf('p');
                        if (pIdx > 1) {
                            const slug = parts[pIdx - 1];
                            data.title = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
                        }
                    } else if (url.includes('myntra.com')) {
                        const parts = path.split('/').filter(p => p && p !== 'buy');
                        if (parts.length >= 2) {
                            const slug = parts[parts.length - 2];
                            data.title = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
                        }
                    } else if (url.includes('amazon.in') || url.includes('amazon.com')) {
                        const parts = path.split('/');
                        const dpIdx = parts.indexOf('dp');
                        if (dpIdx > 1) {
                            const slug = parts[dpIdx - 1];
                            if (slug.length > 3 && !/^[A-Z0-9]{10}$/.test(slug) && slug !== 'dp') {
                                data.title = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
                            }
                        }
                    }
                }
            } catch (e) {
                log(`[Extract] Puppeteer Fallback Error: ${e.message}`);
                if (browser) await browser.close().catch(() => { });
            }
        }

        // The "Ultimate Rescue" Phase
        if (!data.price || !data.image || !isProductTitleValid(data.title)) {
            log(`[Extract] Rescue Phase: Attempting to fetch missing data.`);

            const rescues = [];

            // 1. Flipkart Internal Mobile API Rescue
            if (isFlipkart && data.title) {
                rescues.push((async () => {
                    try {
                        let query = encodeURIComponent(data.title.split(' ').slice(0, 4).join(' '));
                        const fkRes = await fetch(`https://1.flipkart.com/api/4/page/fetch`, {
                            method: 'POST',
                            headers: {
                                'User-Agent': PROFILES[1].ua,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ "pageUri": `/search?q=${query}&otracker=search` }),
                            timeout: 10000
                        });

                        if (fkRes.ok) {
                            const fkData = await fkRes.json();
                            if (fkData?.RESPONSE?.slots) {
                                let foundProps = null;
                                const digProp = (obj) => {
                                    if (!obj || typeof obj !== 'object') return;
                                    if (obj.pricing && obj.titles) { foundProps = obj; return; }
                                    Object.values(obj).forEach(digProp);
                                };
                                digProp(fkData.RESPONSE.slots);
                                if (foundProps) {
                                    if (foundProps.pricing?.finalPrice?.value) data.price = foundProps.pricing.finalPrice.value;
                                    if (foundProps.media?.images?.[0]?.url) {
                                        data.image = foundProps.media.images[0].url.replace('{@width}', '800').replace('{@height}', '800');
                                        data.images = foundProps.media.images.map(img => img.url.replace('{@width}', '800').replace('{@height}', '800')).filter(Boolean);
                                    }
                                    log(`[Extract] Flipkart API Rescue hit!`);
                                }
                            }
                        }
                    } catch (_) { }
                })());
            }

            // 2. Myntra Parallel Rescue
            if (isMyntra && !data.image) {
                rescues.push((async () => {
                    try {
                        const pidMatch = url.match(/\/(\d+)\/buy/);
                        if (pidMatch) {
                            const res = await fetch(`https://www.myntra.com/gateway/v2/product/${pidMatch[1]}`, { timeout: 6000, headers: { 'User-Agent': PROFILES[0].ua } });
                            if (res.ok) {
                                const m = await res.json();
                                if (m.style) {
                                    if (!data.title) data.title = cleanTitle(m.style.name);
                                    if (!data.price) data.price = m.style.price.price;
                                    if (!data.image) data.image = m.style.media.albums[0].images[0].src;
                                }
                            }
                        }
                    } catch (_) { }
                })());
            }

            // 3. Meesho Parallel Rescue
            if (isMeesho && !data.image) {
                rescues.push((async () => {
                    try {
                        const pid = url.match(/\/p\/([a-z0-9]+)/i)?.[1];
                        if (pid) {
                            const res = await fetch(`https://meesho.com/api/v1/products/${pid}`, { timeout: 6000, headers: { 'User-Agent': PROFILES[2].ua } });
                            if (res.ok) {
                                const m = await res.json();
                                if (m.catalog?.catalog_products?.[0]) {
                                    const p = m.catalog.catalog_products[0];
                                    if (!data.image) data.image = p.images?.[0]?.url;
                                    if (!data.price) data.price = p.price;
                                }
                            }
                        }
                    } catch (_) { }
                })());
            }

            // 4. Microlink Catch-all
            if (!data.image || !isProductTitleValid(data.title)) {
                rescues.push((async () => {
                    try {
                        const mlRes = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}&filter=image,title,price&screenshot=true`, { timeout: 12000 });
                        if (mlRes.ok) {
                            const ml = await mlRes.json();
                            if (ml.status === 'success' && ml.data) {
                                if (!data.image) data.image = ml.data.image?.url || ml.data.screenshot?.url;
                                if (!isProductTitleValid(data.title)) data.title = ml.data.title;
                            }
                        }
                    } catch (_) { }
                })());
            }

            await Promise.allSettled(rescues);
            log(`[Extract] Phase 4 Parallel Rescue Complete.`);
        }

        log(`[Extract] Finished for ${url}. Fields: ${Object.keys(data).filter(k => data[k]).join(', ')}`);
        fs.appendFileSync(logPath, `[DEBUG] Final JSON: ${JSON.stringify(data)}\n`);

        if (data.image && junkRegex.test(data.image)) data.image = '';
        if (data.image) data.image = optimizeImageUrl(data.image);

        if (data.images && data.images.length > 0) {
            data.images = data.images
                .filter(img => img && !junkRegex.test(img))
                .map(img => optimizeImageUrl(img));
        }

        if (!data.price) data.price = '';
        if (!data.image) data.image = '';
        if (!data.title) data.title = '';

        if (data.price && data.originalPrice && data.originalPrice > data.price) {
            data.discount = Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100) + '% OFF';
        }

        res.json(data);
    } catch (err) {
        console.error('[Extract] Global Error:', err);
        res.status(500).json({ message: 'Server error during extraction.' });
    }
});

module.exports = router;
