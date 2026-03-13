import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, keywords, name, type, image }) => {
    const defaultTitle = "DealHunter - Best Deals, Coupons & Cashback";
    const defaultDescription = "India's #1 affiliate deals platform. Discover the best offers, coupons, and cashback across 100+ top stores.";
    const defaultKeywords = "deals, coupons, offers, shopping, cashback, discounts, online shopping, Indian deals";

    return (
        <Helmet>
            {/* Standard metadata tags */}
            <title>{title ? `${title} | DealHunter` : defaultTitle}</title>
            <meta name='description' content={description || defaultDescription} />
            <meta name='keywords' content={keywords || defaultKeywords} />

            {/* Facebook / Open Graph tags */}
            <meta property="og:type" content={type || "website"} />
            <meta property="og:title" content={title ? `${title} | DealHunter` : defaultTitle} />
            <meta property="og:description" content={description || defaultDescription} />
            {image && <meta property="og:image" content={image} />}

            {/* Twitter tags */}
            <meta name="twitter:creator" content={name || "DealHunter"} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title ? `${title} | DealHunter` : defaultTitle} />
            <meta name="twitter:description" content={description || defaultDescription} />
            {image && <meta name="twitter:image" content={image} />}
        </Helmet>
    );
}

export default SEO;
