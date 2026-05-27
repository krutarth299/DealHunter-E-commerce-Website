/**
 * Intelligent Category Mapping System
 * Maps store-specific categories to our platform's standardized categories.
 */

const CATEGORY_MAP = {
    // Fashion & Apparel
    'clothing': 'Fashion',
    'apparel': 'Fashion',
    'menswear': 'Fashion',
    'womenswear': 'Fashion',
    'ethnic wear': 'Fashion',
    'western wear': 'Fashion',
    'shoes': 'Footwear',
    'footwear': 'Footwear',
    'sneakers': 'Footwear',
    'watches': 'Accessories',
    'handbags': 'Accessories',
    'jewelry': 'Accessories',
    
    // Electronics
    'mobiles': 'Mobiles',
    'smartphones': 'Mobiles',
    'laptops': 'Electronics',
    'computers': 'Electronics',
    'audio': 'Electronics',
    'headphones': 'Electronics',
    'tablets': 'Electronics',
    'cameras': 'Electronics',
    'television': 'Appliances',
    'tv': 'Appliances',
    'refrigerator': 'Appliances',
    'washing machine': 'Appliances',
    
    // Beauty & Personal Care
    'beauty': 'Beauty',
    'personal care': 'Beauty',
    'skincare': 'Beauty',
    'makeup': 'Beauty',
    'fragrances': 'Beauty',
    
    // Home & Kitchen
    'home decor': 'Home Decor',
    'furniture': 'Home Decor',
    'kitchen': 'Home Decor',
    'bedding': 'Home Decor',
    
    // Others
    'toys': 'Toys',
    'baby': 'Baby Care',
    'sports': 'Sports',
    'fitness': 'Sports',
    'books': 'Books',
    'grocery': 'Grocery'
};

export const mapStoreCategory = (storeCategory = '', productTitle = '') => {
    const category = storeCategory.toLowerCase();
    const title = productTitle.toLowerCase();

    // 1. Direct Mapping
    for (const [keyword, target] of Object.entries(CATEGORY_MAP)) {
        if (category.includes(keyword)) return target;
    }

    // 2. Keyword Search in Title (Fallback)
    for (const [keyword, target] of Object.entries(CATEGORY_MAP)) {
        if (title.includes(keyword)) return target;
    }

    // 3. Store specific logic if needed
    if (title.includes('shirt') || title.includes('jeans') || title.includes('top') || title.includes('dress')) {
        return 'Fashion';
    }

    if (title.includes('shoe') || title.includes('boot') || title.includes('sandal')) {
        return 'Footwear';
    }

    return 'Multi-category';
};
