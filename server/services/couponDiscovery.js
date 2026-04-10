import fetch from 'node-fetch';
import * as cheerioModule from 'cheerio';
import {
    buildAffiliateLink,
    getAffiliateSettings,
    sanitizeOriginalUrl
} from '../utils/affiliate-links.js';
import {
    buildCouponDuplicateKey,
    getStoreSlug,
    normalizeCouponPayload,
    normalizeCouponStore,
    normalizeCouponTitle
} from '../utils/coupons.js';

const cheerio = cheerioModule.default || cheerioModule;

const DEFAULT_SCAN_INTERVAL_MS = Number(process.env.COUPON_SCAN_INTERVAL_MS || 6 * 60 * 60 * 1000);
const DEFAULT_FETCH_TIMEOUT_MS = Number(process.env.COUPON_FETCH_TIMEOUT_MS || 18000);
const DEFAULT_MAX_SOURCE_OFFERS = Number(process.env.COUPON_MAX_OFFERS_PER_SOURCE || 24);
const USER_AGENT = process.env.COUPON_FETCH_USER_AGENT
    || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';

const DEFAULT_STORE_SOURCES = [
    {
        store: 'Amazon',
        url: 'https://www.amazon.in/deals',
        category: 'Multi-category',
        sourceType: 'html',
        offerSelector: '[data-testid*="deal"], [data-csa-c-type="item"], .DealGridItem-module__dealItemDisplayGrid_e7RQVFWSOrwXBX4i24Tqg, a[href*="/deal/"], a[href*="/dp/"]',
        titleSelector: 'h1,h2,h3,span,a',
        urlSelector: 'a[href]'
    },
    {
        store: 'Flipkart',
        url: 'https://www.flipkart.com/offers-store',
        category: 'Multi-category',
        sourceType: 'html',
        offerSelector: 'a[href], [class*="offer"], [class*="coupon"], [class*="deal"]',
        titleSelector: 'span,div,h2,h3,a',
        urlSelector: 'a[href]'
    },
    {
        store: 'Myntra',
        url: 'https://www.myntra.com/online-fashion-store',
        category: 'Fashion',
        sourceType: 'html',
        offerSelector: 'a[href], [class*="coupon"], [class*="offer"], [class*="deal"], [class*="card"]',
        titleSelector: 'span,div,h2,h3,a',
        urlSelector: 'a[href]'
    },
    {
        store: 'Nykaa',
        url: 'https://www.nykaa.com/sp/offers/native-offers',
        category: 'Beauty',
        sourceType: 'html',
        offerSelector: 'a[href], [class*="coupon"], [class*="offer"], [class*="deal"]',
        titleSelector: 'span,div,h2,h3,a',
        urlSelector: 'a[href]'
    },
    {
        store: 'Ajio',
        url: 'https://www.ajio.com/s/offers',
        category: 'Fashion',
        sourceType: 'html',
        offerSelector: 'a[href], [class*="coupon"], [class*="offer"], [class*="deal"]',
        titleSelector: 'span,div,h2,h3,a',
        urlSelector: 'a[href]'
    },
    {
        store: 'Croma',
        url: 'https://www.croma.com/lp-croma-offers',
        category: 'Electronics',
        sourceType: 'html',
        offerSelector: 'a[href], [class*="coupon"], [class*="offer"], [class*="deal"]',
        titleSelector: 'span,div,h2,h3,a',
        urlSelector: 'a[href]'
    }
];

const STORE_HOME_URLS = {
    Amazon: 'https://www.amazon.in/deals',
    Flipkart: 'https://www.flipkart.com/offers-store',
    Myntra: 'https://www.myntra.com/online-fashion-store',
    Nykaa: 'https://www.nykaa.com/sp/offers/native-offers',
    Ajio: 'https://www.ajio.com/s/offers',
    Croma: 'https://www.croma.com/lp-croma-offers',
    'Tata Cliq': 'https://www.tatacliq.com/offers',
    'Reliance Digital': 'https://www.reliancedigital.in/content/offers'
};

const OFFER_KEYWORDS = /\b(?:coupon|code|promo|promocode|offer|deal|sale|cashback|cash\s*back|bank|card|upi|wallet|app\s*only|new\s*user|first\s*order|flat\s*(?:rs\.?|₹|\d)|extra\s+\d+%|save\s+(?:rs\.?|₹|\d)|off|discount)\b/i;
const JUNK_TEXT = /\b(?:privacy|terms|login|sign\s*in|account|wishlist|cart|help|support|careers|download app|copyright|cookie|track order)\b/i;
const COUPON_CODE_REGEX = /\b(?:code|coupon|promo\s*code)\s*[:-]?\s*([A-Z0-9][A-Z0-9_-]{3,24})\b/i;
const STANDALONE_CODE_REGEX = /\b([A-Z]{2,}[A-Z0-9_-]{3,20})\b/g;

const nowIsoBatch = () => new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);

const log = (message, meta = '') => {
    console.log(`${message}${meta ? ` ${meta}` : ''}`);
};

const cleanText = (value = '') => (
    String(value || '')
        .replace(/\s+/g, ' ')
        .replace(/\u00a0/g, ' ')
        .replace(/&amp;/g, '&')
        .trim()
);

const absoluteUrl = (href = '', baseUrl = '') => {
    try {
        return new URL(String(href || '').trim(), baseUrl).toString();
    } catch {
        return '';
    }
};

const isUsefulOfferText = (text = '') => {
    const cleaned = cleanText(text);
    return cleaned.length >= 16
        && cleaned.length <= 320
        && OFFER_KEYWORDS.test(cleaned)
        && !JUNK_TEXT.test(cleaned);
};

const classifyCoupon = ({ title = '', description = '', code = '' } = {}) => {
    const text = `${title} ${description}`.toLowerCase();

    if (/cash\s*back|cashback|rewards?/.test(text)) return 'cashback';
    if (/bank|credit card|debit card|card offer|emi/.test(text)) return 'bank';
    if (/upi|wallet|paytm|phonepe|gpay|google pay|amazon pay/.test(text)) return 'wallet';
    if (/app\s*only|on app|app exclusive/.test(text)) return 'app';
    if (/new user|first order|first purchase|signup|sign up/.test(text)) return 'new-user';
    if (/sale|festival|diwali|holi|christmas|new year|end of season|season/.test(text)) return 'sale';
    if (code) return 'coupon';
    return 'deal';
};

const extractCode = (text = '') => {
    const explicit = cleanText(text).match(COUPON_CODE_REGEX);
    if (explicit?.[1] && !/^(CODE|COUPON|PROMO|OFFER|DEAL)$/i.test(explicit[1])) {
        return explicit[1].toUpperCase();
    }

    const matches = [...cleanText(text).matchAll(STANDALONE_CODE_REGEX)]
        .map((match) => match[1])
        .filter((code) => !/^(SHOP|SALE|DEAL|CODE|OFFER|FLAT|FREE|CASHBACK|BANK|CARD|ONLY|WITH|ORDER|ONLINE|STORE)$/i.test(code));

    return matches[0]?.toUpperCase() || '';
};

const extractDiscountValue = (text = '') => {
    const cleaned = cleanText(text);
    const percent = cleaned.match(/(?:up\s*to|flat|extra)?\s*(\d{1,2})\s*%\s*(?:off|discount|cashback|back)?/i);
    if (percent?.[1]) return `${percent[1]}% OFF`;

    const rupees = cleaned.match(/(?:save|off|discount|cashback|flat|extra)\s*(?:rs\.?|inr|₹)\s*([\d,]+)/i)
        || cleaned.match(/(?:rs\.?|inr|₹)\s*([\d,]+)\s*(?:off|discount|cashback|back)/i);
    if (rupees?.[1]) return `₹${rupees[1].replace(/,/g, '')} OFF`;

    return '';
};

const extractCashbackValue = (text = '') => (
    /cash\s*back|cashback|rewards?/i.test(text) ? extractDiscountValue(text) : ''
);

const extractExpiryDate = (text = '') => {
    const cleaned = cleanText(text);
    const dateLike = cleaned.match(/\b(?:expires?|valid\s*(?:till|until)|ends?)\s*(?:on|by|till|until)?\s*[:-]?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
    if (!dateLike?.[1]) return null;
    const parsed = new Date(dateLike[1]);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const normalizeCandidate = (candidate = {}, source = {}, settings = []) => {
    const title = cleanText(candidate.title);
    const description = cleanText(candidate.description || candidate.title);
    const landingUrl = sanitizeOriginalUrl(candidate.landingUrl || source.url || '');
    const store = normalizeCouponStore(candidate.store || source.store, landingUrl);
    const code = extractCode(`${title} ${description} ${candidate.code || ''}`);
    const offerType = classifyCoupon({ title, description, code: candidate.offerType === 'coupon' ? code : code });
    const sourceType = candidate.sourceType || source.sourceType || 'html';
    const expiryDate = candidate.expiryDate || extractExpiryDate(`${title} ${description}`);
    const affiliateUrl = buildAffiliateLink({
        originalUrl: landingUrl,
        store,
        settings,
        manualOverride: candidate.affiliateUrl || ''
    });

    return normalizeCouponPayload({
        ...candidate,
        title,
        description,
        code,
        offerType: candidate.offerType || offerType,
        store,
        category: candidate.category || source.category || 'Multi-category',
        landingUrl,
        affiliateUrl,
        cashbackValue: candidate.cashbackValue || extractCashbackValue(`${title} ${description}`),
        discountValue: candidate.discountValue || extractDiscountValue(`${title} ${description}`),
        expiryDate,
        isVerified: candidate.isVerified !== false,
        verifiedAt: new Date(),
        isTrending: Boolean(candidate.isTrending) || /trending|hot|popular|limited/i.test(`${title} ${description}`),
        status: 'active',
        terms: candidate.terms || '',
        successRate: candidate.successRate || 0,
        usageCount: candidate.usageCount || 0,
        popularity: candidate.popularity || 0,
        sourceUrl: candidate.sourceUrl || source.url || '',
        sourceType,
        sourceStoreId: candidate.sourceStoreId || '',
        autoFetched: candidate.autoFetched !== false,
        fetchedAt: new Date(),
        lastSeenAt: new Date(),
        scanBatchId: candidate.scanBatchId || '',
        lastFetchStatus: 'ok',
        isAppOnly: candidate.isAppOnly || /app\s*only|app exclusive/i.test(`${title} ${description}`),
        isNewUserOnly: candidate.isNewUserOnly || /new user|first order|first purchase/i.test(`${title} ${description}`),
        bankName: candidate.bankName || '',
        paymentMethod: candidate.paymentMethod || ''
    });
};

const parseJsonLdCoupons = ($, source, settings) => {
    const candidates = [];

    $('script[type="application/ld+json"]').each((_, element) => {
        const raw = $(element).contents().text();
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw);
            const stack = Array.isArray(parsed) ? [...parsed] : [parsed];

            while (stack.length) {
                const node = stack.shift();
                if (!node || typeof node !== 'object') continue;
                if (Array.isArray(node['@graph'])) stack.push(...node['@graph']);
                if (Array.isArray(node.itemListElement)) stack.push(...node.itemListElement.map((item) => item.item || item));
                if (Array.isArray(node.offers)) stack.push(...node.offers);

                const type = String(node['@type'] || node.type || '').toLowerCase();
                const title = cleanText(node.name || node.title || node.headline || node.description);
                const description = cleanText(node.description || node.name || '');
                const url = absoluteUrl(node.url || node.item?.url || '', source.url);

                if ((type.includes('offer') || type.includes('coupon') || isUsefulOfferText(`${title} ${description}`)) && title) {
                    candidates.push(normalizeCandidate({
                        title,
                        description,
                        landingUrl: url || source.url,
                        sourceType: 'json-ld'
                    }, source, settings));
                }
            }
        } catch {
            // Ignore non-JSON tracking blobs.
        }
    });

    return candidates;
};

const parseHtmlCoupons = (html, source, settings) => {
    const $ = cheerio.load(html || '');
    const selectors = source.offerSelector || 'a[href], [class*="coupon"], [class*="offer"], [class*="deal"], article, li';
    const candidates = [...parseJsonLdCoupons($, source, settings)];
    const seenText = new Set(candidates.map((coupon) => coupon.normalizedTitle));

    $(selectors).slice(0, 450).each((_, element) => {
        const $el = $(element);
        const text = cleanText($el.text());
        const titleText = cleanText(
            $el.find(source.titleSelector || 'h1,h2,h3,h4,a,span,strong').map((__, child) => $(child).text()).get().join(' ')
        ) || text;
        const title = cleanText(titleText).slice(0, 180);
        const normalizedTitle = normalizeCouponTitle(title);

        if (!isUsefulOfferText(`${title} ${text}`) || !normalizedTitle || seenText.has(normalizedTitle)) return;

        const urlElement = source.urlSelector ? $el.find(source.urlSelector).first() : $el.is('a[href]') ? $el : $el.find('a[href]').first();
        const href = $el.attr('href') || urlElement.attr('href') || source.url;
        const landingUrl = absoluteUrl(href, source.url) || source.url;
        const description = text.length > title.length ? text.slice(0, 320) : '';

        candidates.push(normalizeCandidate({
            title,
            description,
            landingUrl,
            sourceType: 'html'
        }, source, settings));
        seenText.add(normalizedTitle);
    });

    return candidates;
};

const fetchText = async (url = '') => {
    const response = await fetch(url, {
        timeout: DEFAULT_FETCH_TIMEOUT_MS,
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-IN,en;q=0.9'
        }
    });

    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
};

const getEnvSources = () => {
    const raw = process.env.COUPON_SOURCE_URLS || '';
    if (!raw.trim()) return [];

    return raw
        .split(/\r?\n|,/)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const [storePart, urlPart, categoryPart] = entry.includes('|')
                ? entry.split('|').map((part) => part.trim())
                : ['', entry, ''];

            const url = urlPart || entry;
            return {
                store: storePart || normalizeCouponStore('', url),
                url,
                category: categoryPart || 'Multi-category',
                sourceType: 'env-source'
            };
        });
};

const getDealStoreSources = async ({ DealModel, isMockMode, appLocals } = {}) => {
    const deals = isMockMode
        ? (Array.isArray(appLocals?.deals) ? appLocals.deals : [])
        : DealModel
            ? await DealModel.find().sort({ updatedAt: -1, createdAt: -1 }).limit(120).lean()
            : [];

    const stores = new Map();
    deals.forEach((deal) => {
        const store = normalizeCouponStore(deal.storeName || deal.store, deal.productUrl || deal.link);
        if (!store || store === 'Online Store') return;
        const key = getStoreSlug(store);
        const url = STORE_HOME_URLS[store] || deal.productUrl || deal.link || '';
        if (!url) return;
        const existing = stores.get(key);
        stores.set(key, {
            store,
            url: existing?.url || url,
            category: existing?.category || deal.category || 'Multi-category',
            sourceType: 'html'
        });
    });

    return [...stores.values()];
};

const getScanSources = async ({ DealModel, isMockMode, appLocals } = {}) => {
    const dynamic = await getDealStoreSources({ DealModel, isMockMode, appLocals });
    const sourceMap = new Map();

    [...DEFAULT_STORE_SOURCES, ...dynamic, ...getEnvSources()]
        .filter((source) => source.store && source.url)
        .forEach((source) => {
            const key = `${getStoreSlug(source.store)}|${sanitizeOriginalUrl(source.url)}`;
            if (!sourceMap.has(key)) {
                sourceMap.set(key, source);
            }
        });

    return [...sourceMap.values()];
};

const validateCoupon = (coupon = {}) => {
    if (!coupon.title || coupon.title.length < 8) return 'missing_title';
    if (!coupon.store || coupon.store === 'Online Store') return 'missing_store';
    if (!coupon.landingUrl && !coupon.affiliateUrl) return 'missing_url';
    if (!/^https?:\/\//i.test(coupon.landingUrl || coupon.affiliateUrl || '')) return 'invalid_url';
    if (!coupon.duplicateKey) return 'missing_duplicate_key';
    if (!OFFER_KEYWORDS.test(`${coupon.title} ${coupon.description} ${coupon.discountValue} ${coupon.cashbackValue} ${coupon.code}`)) {
        return 'not_offer_text';
    }
    return '';
};

const upsertCoupon = async ({ CouponModel, rawCoupon, io }) => {
    const coupon = normalizeCouponPayload(rawCoupon);
    const rejectReason = validateCoupon(coupon);

    if (rejectReason) {
        log('[COUPON_REJECTED]', `reason=${rejectReason} title="${coupon.title}" store=${coupon.store}`);
        return { action: 'rejected', reason: rejectReason };
    }

    const lookup = coupon.duplicateKey
        ? { duplicateKey: coupon.duplicateKey }
        : {
            storeSlug: coupon.storeSlug,
            code: coupon.code,
            title: coupon.title
        };

    const existing = await CouponModel.findOne(lookup);
    if (existing) {
        const next = {
            ...coupon,
            createdAt: existing.createdAt,
            isFeatured: existing.isFeatured || coupon.isFeatured,
            isTrending: existing.isTrending || coupon.isTrending,
            reviewStatus: existing.reviewStatus === 'rejected' ? 'rejected' : coupon.reviewStatus,
            usageCount: Math.max(existing.usageCount || 0, coupon.usageCount || 0),
            popularity: Math.max(existing.popularity || 0, coupon.popularity || 0)
        };
        Object.assign(existing, next);
        const updated = await existing.save();
        io?.emit?.('updateCoupon', updated);
        log('[COUPON_UPDATED]', `id=${updated._id} store=${updated.store} key=${updated.duplicateKey}`);
        return { action: 'updated', coupon: updated };
    }

    const created = await CouponModel.create(coupon);
    io?.emit?.('newCoupon', created);
    log('[COUPON_SAVED]', `id=${created._id} store=${created.store} key=${created.duplicateKey}`);
    return { action: 'created', coupon: created };
};

const expireCoupons = async (CouponModel) => {
    const result = await CouponModel.updateMany(
        { status: 'active', expiryDate: { $lt: new Date() } },
        {
            $set: {
                status: 'expired',
                lastFetchStatus: 'expired'
            }
        }
    );
    if (result.modifiedCount > 0) {
        log('[COUPON_EXPIRED]', `count=${result.modifiedCount}`);
    }
    return result.modifiedCount || 0;
};

const syncDealOffersAsCoupons = async ({ CouponModel, DealModel, affiliateSettings = [], isMockMode = false, appLocals = {}, io, batchId }) => {
    const deals = isMockMode
        ? (Array.isArray(appLocals.deals) ? appLocals.deals : [])
        : DealModel
            ? await DealModel.find({
                $or: [
                    { discountPercent: { $gte: 20 } },
                    { featured: true }
                ]
            }).sort({ discountPercent: -1, createdAt: -1 }).limit(40).lean()
            : [];

    const stats = { scanned: deals.length, created: 0, updated: 0, rejected: 0 };

    for (const deal of deals) {
        const store = normalizeCouponStore(deal.storeName || deal.store, deal.productUrl || deal.link);
        const landingUrl = sanitizeOriginalUrl(deal.productUrl || deal.link || '');
        const discountValue = deal.discountPercent > 0
            ? `${Math.round(deal.discountPercent)}% OFF`
            : String(deal.discount || '');

        const title = discountValue
            ? `${discountValue} on ${deal.cardTitle || deal.displayTitle || deal.title}`
            : `Live deal on ${deal.cardTitle || deal.displayTitle || deal.title}`;

        const affiliateUrl = buildAffiliateLink({
            originalUrl: landingUrl,
            store,
            settings: affiliateSettings,
            manualOverride: deal.affiliateOverrideLink || ''
        });

        const duplicateKey = buildCouponDuplicateKey({
            title,
            store,
            offerType: 'deal',
            landingUrl,
            code: ''
        });

        const result = await upsertCoupon({
            CouponModel,
            io,
            rawCoupon: {
                title,
                description: `No-code product offer from ${store}. Open the store link to confirm final price, delivery and stock.`,
                offerType: 'deal',
                store,
                category: deal.category || 'Multi-category',
                landingUrl,
                affiliateUrl,
                discountValue,
                isVerified: true,
                verifiedAt: new Date(),
                isFeatured: Boolean(deal.featured),
                isTrending: Number(deal.discountPercent || 0) >= 40,
                status: 'active',
                sourceUrl: landingUrl,
                sourceType: 'deal-sync',
                sourceStoreId: String(deal._id || deal.id || ''),
                duplicateKey,
                autoFetched: true,
                fetchedAt: new Date(),
                lastSeenAt: new Date(),
                scanBatchId: batchId,
                popularity: Number(deal.views || 0)
            }
        });

        if (result.action === 'created') stats.created += 1;
        if (result.action === 'updated') stats.updated += 1;
        if (result.action === 'rejected') stats.rejected += 1;
    }

    return stats;
};

export const scanCoupons = async ({
    CouponModel,
    DealModel,
    AffiliateSettingModel,
    isMockMode = false,
    appLocals = {},
    io,
    limitSources = Number(process.env.COUPON_SCAN_SOURCE_LIMIT || 8),
    includeDealSync = process.env.COUPON_SYNC_DEALS !== 'false',
    manual = false
} = {}) => {
    const scanState = appLocals.couponScanState || {};
    if (scanState.running) {
        return { ...scanState.lastResult, running: true, skipped: true, message: 'Coupon scan already running.' };
    }

    const batchId = `coupon-${nowIsoBatch()}`;
    appLocals.couponScanState = {
        ...scanState,
        running: true,
        startedAt: new Date(),
        lastError: ''
    };

    const summary = {
        batchId,
        manual,
        startedAt: new Date(),
        finishedAt: null,
        sources: 0,
        fetched: 0,
        extracted: 0,
        created: 0,
        updated: 0,
        rejected: 0,
        expired: 0,
        errors: []
    };

    try {
        log('[COUPON_SCAN]', `batch=${batchId} manual=${manual}`);
        const affiliateSettings = AffiliateSettingModel
            ? await getAffiliateSettings(AffiliateSettingModel, isMockMode, appLocals)
            : [];
        const sources = (await getScanSources({ DealModel, isMockMode, appLocals })).slice(0, limitSources);
        summary.sources = sources.length;

        if (!isMockMode && CouponModel) {
            summary.expired = await expireCoupons(CouponModel);
        }

        for (const source of sources) {
            log('[COUPON_FETCH]', `store=${source.store} url=${source.url}`);
            try {
                const response = await fetchText(source.url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                summary.fetched += 1;
                const extracted = parseHtmlCoupons(response.text, source, affiliateSettings)
                    .slice(0, DEFAULT_MAX_SOURCE_OFFERS)
                    .map((coupon) => ({
                        ...coupon,
                        scanBatchId: batchId,
                        sourceUrl: source.url,
                        sourceType: coupon.sourceType === 'json-ld' ? 'json-ld' : source.sourceType === 'env-source' ? 'env-source' : 'html'
                    }));

                log('[COUPON_EXTRACT]', `store=${source.store} count=${extracted.length}`);
                summary.extracted += extracted.length;

                if (isMockMode) {
                    const mockCoupons = Array.isArray(appLocals.coupons) ? appLocals.coupons : [];
                    extracted.forEach((coupon) => {
                        if (!mockCoupons.some((existing) => existing.duplicateKey === coupon.duplicateKey)) {
                            mockCoupons.unshift({ ...coupon, _id: `${Date.now()}-${mockCoupons.length}` });
                            summary.created += 1;
                        } else {
                            summary.updated += 1;
                        }
                    });
                    appLocals.coupons = mockCoupons;
                    continue;
                }

                for (const coupon of extracted) {
                    const result = await upsertCoupon({ CouponModel, rawCoupon: coupon, io });
                    if (result.action === 'created') summary.created += 1;
                    if (result.action === 'updated') summary.updated += 1;
                    if (result.action === 'rejected') summary.rejected += 1;
                }
            } catch (error) {
                const message = error.message || 'coupon source fetch failed';
                summary.errors.push({ store: source.store, url: source.url, message });
                log('[COUPON_ERROR]', `store=${source.store} url=${source.url} error="${message}"`);
            }
        }

        if (includeDealSync && CouponModel && !isMockMode) {
            const dealSync = await syncDealOffersAsCoupons({
                CouponModel,
                DealModel,
                affiliateSettings,
                isMockMode,
                appLocals,
                io,
                batchId
            });
            summary.extracted += dealSync.scanned;
            summary.created += dealSync.created;
            summary.updated += dealSync.updated;
            summary.rejected += dealSync.rejected;
        }

        summary.finishedAt = new Date();
        appLocals.couponScanState = {
            running: false,
            lastResult: summary,
            lastRunAt: summary.finishedAt,
            lastError: summary.errors[0]?.message || ''
        };
        log('[COUPON_SCAN_DONE]', `batch=${batchId} created=${summary.created} updated=${summary.updated} rejected=${summary.rejected} errors=${summary.errors.length}`);
        return summary;
    } catch (error) {
        summary.finishedAt = new Date();
        summary.errors.push({ message: error.message || 'coupon scan failed' });
        appLocals.couponScanState = {
            running: false,
            lastResult: summary,
            lastRunAt: summary.finishedAt,
            lastError: error.message || 'coupon scan failed'
        };
        log('[COUPON_ERROR]', `batch=${batchId} error="${error.message || error}"`);
        throw error;
    }
};

export const startCouponScheduler = ({ app, CouponModel, DealModel, AffiliateSettingModel, io } = {}) => {
    if (!app?.locals || app.locals.couponSchedulerIntervalId) {
        return;
    }

    const intervalMs = Math.max(15 * 60 * 1000, DEFAULT_SCAN_INTERVAL_MS);
    const runScheduledScan = () => {
        if (app.locals.isMockMode || !CouponModel) return;
        scanCoupons({
            CouponModel,
            DealModel,
            AffiliateSettingModel,
            isMockMode: app.locals.isMockMode,
            appLocals: app.locals,
            io,
            manual: false
        }).catch((error) => {
            app.locals.couponScanState = {
                ...(app.locals.couponScanState || {}),
                running: false,
                lastError: error.message || 'scheduled coupon scan failed',
                lastRunAt: new Date()
            };
        });
    };

    app.locals.couponSchedulerIntervalId = setInterval(runScheduledScan, intervalMs);
    app.locals.couponScanState = app.locals.couponScanState || { running: false, lastResult: null };
    log('[COUPON_SCAN]', `scheduler=active intervalMs=${intervalMs}`);

    if (process.env.COUPON_SCAN_ON_START !== 'false') {
        setTimeout(runScheduledScan, Number(process.env.COUPON_SCAN_START_DELAY_MS || 15000));
    }
};

export const getCouponScanStatus = (appLocals = {}) => ({
    running: Boolean(appLocals.couponScanState?.running),
    lastRunAt: appLocals.couponScanState?.lastRunAt || null,
    startedAt: appLocals.couponScanState?.startedAt || null,
    lastError: appLocals.couponScanState?.lastError || '',
    lastResult: appLocals.couponScanState?.lastResult || null
});
