import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { generateSeoTitle, generateSeoDescription, generateSeoKeywords } from '../utils/seoBuilder';
import {
    makePageTitle,
    SITE_DESCRIPTION,
    SITE_LOCALE,
    SITE_NAME,
    SITE_ORIGIN,
    SITE_SOCIAL_IMAGE,
    SITE_THEME_COLOR,
    SITE_TITLE,
    SITE_TWITTER_HANDLE
} from '../config/brand';
import { slugifyProductTitle } from '../utils/productUrls';

const cleanPathname = (pathname = '/') => {
    const clean = `/${String(pathname).split('#')[0].split('?')[0].replace(/^\/+/, '')}`;
    return clean === '/index.html' || clean === '/home' ? '/' : clean.replace(/\/+$/, '') || '/';
};

const toAbsoluteUrl = (value = '') => {
    const rawValue = String(value || '').trim();
    if (!rawValue) return '';
    if (/^https?:\/\//i.test(rawValue)) return rawValue;
    return `${SITE_ORIGIN}${rawValue.startsWith('/') ? rawValue : `/${rawValue}`}`;
};

const resolveCanonicalPath = (pathname = '/', search = '') => {
    const path = cleanPathname(pathname);
    if (path !== '/deals') return path;

    const params = new URLSearchParams(search);
    const canonicalParams = new URLSearchParams();
    const category = params.get('category');
    const store = params.get('store');

    if (category) canonicalParams.set('category', category);
    if (store && !category) canonicalParams.set('store', store);

    const query = canonicalParams.toString();
    return query ? `${path}?${query}` : path;
};

const parsePrice = (value) => {
    const price = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(price) && price > 0 ? price : 0;
};

const cleanMetaDescription = (value) => {
    const description = String(value || SITE_DESCRIPTION).replace(/\s+/g, ' ').trim();
    if (description.length <= 165) return description;
    return `${description.slice(0, 162).replace(/\s+\S*$/, '')}...`;
};

const getProductImages = (product = {}, fallbackImage = '') => {
    const images = [
        product.thumbnail,
        fallbackImage,
        product.image,
        product.mainImage,
        ...(Array.isArray(product.images) ? product.images : [])
    ].filter(Boolean).map(toAbsoluteUrl);

    return [...new Set(images)];
};

const createDefaultSchema = ({ title, description, canonicalUrl, imageUrl }) => ([
    {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_ORIGIN,
        logo: toAbsoluteUrl('/logo.png'),
        image: imageUrl
    },
    {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        alternateName: SITE_TITLE,
        url: SITE_ORIGIN,
        description,
        publisher: {
            '@type': 'Organization',
            name: SITE_NAME,
            logo: {
                '@type': 'ImageObject',
                url: toAbsoluteUrl('/logo.png')
            }
        }
    },
    {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description,
        url: canonicalUrl,
        isPartOf: {
            '@type': 'WebSite',
            name: SITE_NAME,
            url: SITE_ORIGIN
        }
    }
]);

const createBreadcrumbSchema = (breadcrumbs = []) => {
    const items = breadcrumbs
        .filter((item) => item?.name && item?.url)
        .map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: toAbsoluteUrl(item.url)
        }));

    if (items.length < 2) return null;

    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items
    };
};

const createProductSchema = ({ product, canonicalUrl, image, description, title }) => {
    if (!product || !title) return null;

    const dealPrice = parsePrice(product.dealPrice || product.price);
    const mrp = parsePrice(product.mrp || product.originalPrice);
    const productUrl = toAbsoluteUrl(product.productUrl || product.link || product.affiliateLink || canonicalUrl);
    const images = getProductImages(product, image);
    const storeName = product.storeName || product.store || SITE_NAME;
    const productName = product.fullTitle || title;
    const alternateName = product.shortTitle || product.cardTitle || '';
    const reviewCount = Number(product.reviewCount || product.ratingCount || 0);
    const ratingValue = Number(product.rating || product.aggregateRating || 0);
    const specifications = product.specifications && typeof product.specifications === 'object' ? product.specifications : null;
    const highlights = Array.isArray(product.highlights) ? product.highlights.filter(Boolean).slice(0, 8) : [];
    const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: productName,
        alternateName: alternateName || undefined,
        description: product.shortDescription || description,
        image: images.length > 0 ? images : [toAbsoluteUrl(SITE_SOCIAL_IMAGE)],
        url: canonicalUrl,
        category: product.category || undefined,
        productID: product.slug || product.sourceProductId || product.productId || product.asin || product._id || product.id || undefined,
        sku: product.sourceProductId || product.productId || product.asin || product._id || product.id || undefined,
        brand: {
            '@type': 'Brand',
            name: product.brand || storeName
        },
        offers: dealPrice ? {
            '@type': 'Offer',
            url: productUrl,
            priceCurrency: product.currency || 'INR',
            price: dealPrice,
            highPrice: mrp && mrp >= dealPrice ? mrp : undefined,
            priceValidUntil: product.priceCheckedAt ? new Date(product.priceCheckedAt).toISOString().slice(0, 10) : undefined,
            itemCondition: 'https://schema.org/NewCondition',
            availability: product.isExpired ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
            seller: {
                '@type': 'Organization',
                name: storeName
            }
        } : undefined
    };

    if (Array.isArray(highlights) && highlights.length > 0) {
        productSchema.additionalProperty = highlights.map((text) => ({
            '@type': 'PropertyValue',
            name: 'Highlight',
            value: text
        }));
    }

    if (specifications) {
        const specEntries = Object.entries(specifications).slice(0, 12);
        if (specEntries.length > 0) {
            productSchema.additionalProperty = [
                ...(productSchema.additionalProperty || []),
                ...specEntries.map(([key, value]) => ({
                    '@type': 'PropertyValue',
                    name: key,
                    value: Array.isArray(value) ? value.join(', ') : String(value)
                }))
            ];
        }
    }

    if (ratingValue > 0 && reviewCount > 0) {
        productSchema.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: Math.min(5, Math.max(1, ratingValue)),
            reviewCount
        };
    }

    return productSchema;
};

const createItemListSchema = ({ items = [], canonicalUrl }) => {
    const listItems = items
        .filter(Boolean)
        .slice(0, 24)
        .map((item, index) => {
            const id = item._id || item.id;
            const slug = item.slug || item.pageSlug || slugifyProductTitle(item.displayTitle || item.fullTitle || item.title || item.name || '');
            const url = item.url || item.pageUrl || item.canonicalUrl || (id ? `/product/${slug}-${id}` : (slug ? `/product/${slug}` : ''));
            return {
                '@type': 'ListItem',
                position: index + 1,
                url: toAbsoluteUrl(url),
                name: item.displayTitle || item.title || item.name
            };
        })
        .filter((item) => item.name && item.url);

    if (listItems.length === 0) return null;

    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        url: canonicalUrl,
        itemListElement: listItems
    };
};

const asSchemaArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value.filter(Boolean) : [value];
};

const SEO = ({
    title,
    description,
    name,
    type,
    image,
    canonical,
    robots = 'index, follow',
    noindex = false,
    product,
    itemList,
    breadcrumbs,
    structuredData,
    keywords
}) => {
    const location = useLocation();
    
    const productData = React.useMemo(() => product ? {
        title: product.displayTitle || product.title || '',
        store: product.store || '',
        category: product.category || '',
        discount: product.discount || 0
    } : null, [product]);

    const finalTitle = title || generateSeoTitle(productData);
    const finalDescription = description || generateSeoDescription(productData);
    const canonicalPath = canonical || resolveCanonicalPath(location.pathname, location.search);
    const canonicalUrl = toAbsoluteUrl(canonicalPath);
    const finalImage = toAbsoluteUrl(image || SITE_SOCIAL_IMAGE);
    
    // SEO Step 5: Auto Keyword Generation
    const metaKeywords = React.useMemo(() => {
        if (keywords) return keywords;
        return generateSeoKeywords(productData);
    }, [productData, keywords]);

    const robotsContent = noindex ? 'noindex, nofollow, noarchive' : robots;
    const productSchema = createProductSchema({
        product,
        canonicalUrl,
        image,
        title: product?.displayTitle || product?.title || title,
        description: product?.description || finalDescription
    });
    const itemListSchema = createItemListSchema({ items: itemList, canonicalUrl });
    const breadcrumbSchema = createBreadcrumbSchema(breadcrumbs);
    const schemas = [
        ...createDefaultSchema({
            title: finalTitle,
            description: finalDescription,
            canonicalUrl,
            imageUrl: finalImage
        }),
        productSchema,
        itemListSchema,
        breadcrumbSchema,
        ...asSchemaArray(structuredData)
    ].filter(Boolean);
    const schemaJson = JSON.stringify(schemas.length === 1 ? schemas[0] : { '@context': 'https://schema.org', '@graph': schemas }, null, 2);

    return (
        <Helmet>
            <script
                type="application/ld+json"
            >
                {schemaJson}
            </script>
            <title>{finalTitle || SITE_TITLE}</title>
            <meta name="description" content={finalDescription} />
            <meta name="keywords" content={metaKeywords} />
            <meta name="robots" content={robotsContent} />
            <meta name="theme-color" content={SITE_THEME_COLOR} />
            <meta name="application-name" content={SITE_NAME} />
            <meta name="author" content={SITE_NAME} />
            <link rel="canonical" href={canonicalUrl} />

            <meta property="og:type" content={type || "website"} />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:locale" content={SITE_LOCALE} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:title" content={finalTitle} />
            <meta property="og:description" content={finalDescription} />
            <meta property="og:image" content={finalImage} />
            <meta property="og:image:secure_url" content={finalImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={`${SITE_NAME} - verified online deals`} />

            <meta name="twitter:creator" content={name || SITE_NAME} />
            {SITE_TWITTER_HANDLE && <meta name="twitter:site" content={SITE_TWITTER_HANDLE} />}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={canonicalUrl} />
            <meta name="twitter:title" content={finalTitle} />
            <meta name="twitter:description" content={finalDescription} />
            <meta name="twitter:image" content={finalImage} />

        </Helmet>
    );
}

export default SEO;
