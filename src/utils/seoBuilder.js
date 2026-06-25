import { seoKeywords } from '../seo/seoKeywords';

/**
 * Generates an SEO-optimized title for a product deal
 */
export const generateSeoTitle = (product) => {
  if (!product) return "Best Deals, Offers & Coupons | Save Money Shopping Online";
  
  const discountText = product.discountPercent > 0 ? `| ${product.discountPercent}% OFF` : (product.discount ? `| ${product.discount} OFF` : "");
  const storeText = product.store ? `at ${product.store}` : "";
  const priceText = product.dealPrice > 0 ? `- Just ₹${product.dealPrice}` : "";
  
  return `Buy ${product.title} ${priceText} ${storeText} ${discountText} | Today's Best Deal`.replace(/\s+/g, ' ').trim();
};

/**
 * Generates an SEO-optimized meta description
 */
export const generateSeoDescription = (product) => {
  if (!product) return "Discover the biggest discounts, exclusive coupons, and lowest prices on electronics, fashion, and home appliances from top stores like Amazon and Flipkart.";
  
  const store = product.store || "online";
  const discount = product.discountPercent > 0 ? `Save ${product.discountPercent}%` : (product.discount ? `Save ${product.discount}` : "Get huge savings");
  const priceText = product.dealPrice > 0 ? ` for just ₹${product.dealPrice}` : "";
  const mrpText = (product.mrp || product.originalPrice) > product.dealPrice ? ` (Original Price: ₹${product.mrp || product.originalPrice})` : "";
  const categoryText = product.category ? ` Top rated in ${product.category}.` : "";
  const ratingText = product.rating > 0 ? ` ⭐ ${product.rating}/5 Rated.` : "";
  
  return `Looking for the best price? ${discount} on ${product.title}${priceText}${mrpText} at ${store}.${categoryText}${ratingText} Click here to grab this exclusive deal before it expires! Verified affiliate offers & lowest price guaranteed.`.replace(/\s+/g, ' ').trim();
};

/**
 * Generates meta keywords based on product context
 */
export const generateSeoKeywords = (product) => {
  if (!product) return seoKeywords.global.join(", ");
  
  const keywords = [...seoKeywords.global];
  
  if (product.store && seoKeywords[product.store.toLowerCase()]) {
    keywords.push(...seoKeywords[product.store.toLowerCase()]);
  }
  
  if (product.category && seoKeywords.categories[product.category.toLowerCase()]) {
    keywords.push(...seoKeywords.categories[product.category.toLowerCase()]);
  }
  
  keywords.push(product.title, `${product.title} offer`, `${product.title} price drop`);
  
  return [...new Set(keywords)].join(", ");
};

/**
 * Generates JSON-LD structured data for a product
 */
export const generateProductSchema = (product) => {
  if (!product) return null;

  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.title,
    "image": product.imageUrl || product.images?.[0] || product.thumbnail,
    "description": product.shortDescription || product.description || product.title,
    "brand": {
      "@type": "Brand",
      "name": product.brand || product.store || "Retail"
    },
    "offers": {
      "@type": "Offer",
      "url": typeof window !== 'undefined' ? window.location.href : '',
      "priceCurrency": "INR",
      "price": product.dealPrice || product.price,
      "priceValidUntil": product.isExpired ? new Date().toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      "itemCondition": "https://schema.org/NewCondition",
      "availability": product.availability?.toLowerCase() === 'out of stock' || product.isExpired 
          ? "https://schema.org/OutOfStock" 
          : "https://schema.org/InStock"
    }
  };

  if (product.rating && product.reviewCount) {
      schema.aggregateRating = {
          "@type": "AggregateRating",
          "ratingValue": product.rating,
          "reviewCount": product.reviewCount
      };
  }

  if (product.category) {
      schema.category = product.category;
  }

  return schema;
};

/**
 * Updates document head meta tags dynamically
 */
export const updateMetaTags = (product) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const title = generateSeoTitle(product);
  const description = generateSeoDescription(product);
  const keywords = generateSeoKeywords(product);
  const url = window.location.href;
  const image = product?.imageUrl || product?.images?.[0] || "/logo.png";

  // Standard Meta Tags
  document.title = title;
  updateOrCreateMeta('description', description);
  updateOrCreateMeta('keywords', keywords);
  
  // Canonical URL
  updateOrCreateLink('canonical', url);

  // Open Graph / Facebook
  updateOrCreateMeta('og:type', 'product', 'property');
  updateOrCreateMeta('og:title', title, 'property');
  updateOrCreateMeta('og:description', description, 'property');
  updateOrCreateMeta('og:url', url, 'property');
  updateOrCreateMeta('og:image', image, 'property');

  // Twitter
  updateOrCreateMeta('twitter:card', 'summary_large_image', 'name');
  updateOrCreateMeta('twitter:title', title, 'name');
  updateOrCreateMeta('twitter:description', description, 'name');
  updateOrCreateMeta('twitter:image', image, 'name');

  // Structured Data (JSON-LD)
  const schema = generateProductSchema(product);
  if (schema) {
    let script = document.getElementById('json-ld-product');
    if (!script) {
      script = document.createElement('script');
      script.id = 'json-ld-product';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);
  }
};

const updateOrCreateMeta = (name, content, attr = 'name') => {
  let meta = document.querySelector(`meta[${attr}="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
};

const updateOrCreateLink = (rel, href) => {
  let link = document.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
};
