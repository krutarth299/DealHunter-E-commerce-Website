import { seoKeywords } from '../seo/seoKeywords';

/**
 * Generates an SEO-optimized title for a product deal
 */
export const generateSeoTitle = (product) => {
  if (!product) return "Best Deals & Discounts | Latest Online Offers";
  
  const discountText = product.discount > 0 ? `| ${product.discount}% OFF` : "";
  const storeText = product.store ? `on ${product.store}` : "";
  
  return `${product.title} Deal ${storeText} ${discountText} | Best Price Today`.replace(/\s+/g, ' ').trim();
};

/**
 * Generates an SEO-optimized meta description
 */
export const generateSeoDescription = (product) => {
  if (!product) return "Find the latest online shopping deals, discounts, and offers from Amazon, Flipkart, Myntra and more. Get best prices on electronics, fashion and more.";
  
  const store = product.store || "online";
  return `Get the best deal on ${product.title} from ${store}. Latest price, ${product.discount}% discount, hot offers and complete product details available now.`.replace(/\s+/g, ' ').trim();
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

  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.title,
    "image": product.imageUrl || product.images?.[0],
    "description": product.description || product.title,
    "brand": {
      "@type": "Brand",
      "name": product.store || "Retail"
    },
    "offers": {
      "@type": "Offer",
      "url": typeof window !== 'undefined' ? window.location.href : '',
      "priceCurrency": "INR",
      "price": product.dealPrice,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": "https://schema.org/InStock"
    }
  };
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
