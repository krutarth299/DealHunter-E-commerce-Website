import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, keywords, name, type, image }) => {
    const defaultTitle = "DealSphere - Smart Deals Around the World";
    const defaultDescription = "Smart deals around the world. Discover the best offers, coupons, and cashback across 100+ top stores.";
    const defaultKeywords = "deals, coupons, offers, shopping, cashback, discounts, online shopping, Indian deals";

    return (
        <Helmet>
            {/* Standard metadata tags */}
            <title>{title ? `${title} | DealSphere` : defaultTitle}</title>
            <meta name='description' content={description || defaultDescription} />
            <meta name='keywords' content={keywords || defaultKeywords} />

            {/* Facebook / Open Graph tags */}
            <meta property="og:type" content={type || "website"} />
            <meta property="og:title" content={title ? `${title} | DealSphere` : defaultTitle} />
            <meta property="og:description" content={description || defaultDescription} />
            {image && <meta property="og:image" content={image} />}

            {/* Twitter tags */}
            <meta name="twitter:creator" content={name || "DealSphere"} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title ? `${title} | DealSphere` : defaultTitle} />
            <meta name="twitter:description" content={description || defaultDescription} />
            {image && <meta name="twitter:image" content={image} />}
        </Helmet>
    );
}

export default SEO;
