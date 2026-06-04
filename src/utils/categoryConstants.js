import { 
    Smartphone, Shirt, Gamepad2, Plane, Utensils, ShoppingBag,
    Sparkles, Zap, Home as HomeIcon, Layers, BookOpen, Dumbbell, 
    Car, Baby, Watch, Headphones, Camera, Laptop, Heart, 
    Sofa, Gem, Gift, PawPrint, Bike, Package, Briefcase, 
    Stethoscope, Wrench, Cpu
} from 'lucide-react';

export const CATEGORY_MAP = {
    // Tech & Electronics
    'Electronics':      { icon: Smartphone,      bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Mobiles':          { icon: Smartphone,      bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Laptops':          { icon: Laptop,          bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Gaming':           { icon: Gamepad2,        bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Digital Products': { icon: Cpu,             bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Audio':            { icon: Headphones,      bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Cameras':          { icon: Camera,          bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Appliances':       { icon: Zap,             bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    
    // Fashion & Lifestyle
    'Fashion':          { icon: Shirt,           bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Footwear':         { icon: Bike,            bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Accessories':      { icon: Gift,            bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Beauty & Personal Care': { icon: Sparkles,  bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Beauty':           { icon: Sparkles,        bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Watches':          { icon: Watch,           bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Jewelry':          { icon: Gem,             bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    
    // Home & Living
    'Home & Kitchen':   { icon: HomeIcon,        bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Furniture':        { icon: Sofa,            bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Industrial & Tools': { icon: Wrench,        bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    
    // Food & Groceries
    'Groceries':        { icon: ShoppingBag,     bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Grocery':          { icon: ShoppingBag,     bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Food':             { icon: Utensils,        bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    
    // Health & Family
    'Baby':             { icon: Baby,            bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Baby Products':    { icon: Baby,            bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Health':           { icon: Stethoscope,     bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Health & Medical': { icon: Stethoscope,     bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Pet Supplies':     { icon: PawPrint,        bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    
    // Education & Hobby
    'Books & Media':    { icon: BookOpen,        bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Toys & Games':     { icon: Gift,            bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Office & Stationery': { icon: Briefcase,     bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Sports & Fitness': { icon: Dumbbell,        bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    
    // Travel & Auto
    'Automotive':       { icon: Car,             bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
    'Travel':           { icon: Plane,           bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },

// Others
    'Multi-category':   { icon: Layers,          bg: 'bg-slate-50',     icon_color: 'text-slate-700',     border: 'border-slate-200', shadow: 'shadow-slate-500/10' },
};

export const normalizeCategory = (catName) => {
    if (!catName) return '';
    const lower = catName.toLowerCase();
    
    if (lower.includes('beauty') || lower.includes('care') || lower.includes('makeup') || lower.includes('cosmetic')) return 'Beauty & Personal Care';
    if (lower.includes('baby') || lower.includes('toy') || lower.includes('game') || lower.includes('kid')) {
        if (lower.includes('toy') || lower.includes('game')) return 'Toys & Games';
        return 'Baby Products';
    }
    if (lower.includes('home') || lower.includes('kitchen') || lower.includes('living') || lower.includes('furniture') || lower.includes('decor') || lower.includes('appliance')) return 'Home & Kitchen';
    if (lower.includes('electron') || lower.includes('mobile') || lower.includes('phone') || lower.includes('computer') || lower.includes('laptop') || lower.includes('tablet')) return 'Electronics';
    if (lower.includes('audio') || lower.includes('headphone') || lower.includes('music') || lower.includes('sound')) return 'Electronics';
    if (lower.includes('shoe') || lower.includes('sandal') || lower.includes('slipper') || lower.includes('footwear')) return 'Footwear';
    if (lower.includes('bag') || lower.includes('wallet') || lower.includes('belt') || lower.includes('sunglass') || lower.includes('accessor')) return 'Accessories';
    if (lower.includes('fashion') || lower.includes('cloth') || lower.includes('wear') || lower.includes('apparel')) return 'Fashion';
    if (lower.includes('sport') || lower.includes('fitness') || lower.includes('gym') || lower.includes('exercise')) return 'Sports & Fitness';
    if (lower.includes('grocery') || lower.includes('food') || lower.includes('eat') || lower.includes('beverage')) return 'Groceries';
    if (lower.includes('health') || lower.includes('medical') || lower.includes('medicine') || lower.includes('well')) return 'Health & Medical';
    if (lower.includes('pet')) return 'Pet Supplies';
    if (lower.includes('travel') || lower.includes('hotel') || lower.includes('flight') || lower.includes('trip')) return 'Travel'; // Although not in featured, we can add it or map to something else. Actually let's add it to featured if it's common.
    if (lower.includes('toy') || lower.includes('game') || lower.includes('fun')) return 'Toys & Games';
    if (lower.includes('office') || lower.includes('stationery')) return 'Office & Stationery';
    if (lower.includes('book') || lower.includes('media')) return 'Books & Media';
    if (lower.includes('industrial') || lower.includes('tool')) return 'Industrial & Tools';
    
    // Return original if no match, or capitalize
    return catName;
};

export const FEATURED_CATEGORIES = [
    'Electronics', 'Fashion', 'Footwear', 'Accessories', 'Beauty & Personal Care', 'Home & Kitchen',
    'Furniture', 'Groceries', 'Baby Products', 'Sports & Fitness', 'Books & Media',
    'Toys & Games', 'Automotive', 'Office & Stationery', 'Health & Medical', 
    'Travel', 'Pet Supplies', 'Industrial & Tools', 'Digital Products'
];

export const getCategoryStyle = (catName) => {
    if (!catName) return { icon: ShoppingBag, bg: 'bg-slate-50', icon_color: 'text-slate-500', border: 'border-slate-100', shadow: 'shadow-slate-500/5' };
    
    // Direct match first
    if (CATEGORY_MAP[catName]) return CATEGORY_MAP[catName];
    
    // Case-insensitive match
    const lower = catName.toLowerCase();
    const match = Object.keys(CATEGORY_MAP).find(k => k.toLowerCase() === lower);
    if (match) return CATEGORY_MAP[match];
    
    // Keyword match
    if (lower.includes('beauty') || lower.includes('personal') || lower.includes('care') || lower.includes('makeup') || lower.includes('cosmetic')) return CATEGORY_MAP['Beauty & Personal Care'];
    if (lower.includes('baby') || lower.includes('diaper') || lower.includes('toy') || lower.includes('kid') || lower.includes('stroller')) {
        if (lower.includes('toy') || lower.includes('game')) return CATEGORY_MAP['Toys & Games'];
        return CATEGORY_MAP['Baby Products'];
    }
    if (lower.includes('sport') || lower.includes('fitness') || lower.includes('gym') || lower.includes('exercise')) return CATEGORY_MAP['Sports & Fitness'];
    if (lower.includes('book') || lower.includes('media') || lower.includes('magazine') || lower.includes('e-book')) return CATEGORY_MAP['Books & Media'];
    if (lower.includes('office') || lower.includes('stationery') || lower.includes('school') || lower.includes('pen') || lower.includes('pencil')) return CATEGORY_MAP['Office & Stationery'];
    if (lower.includes('health') || lower.includes('medical') || lower.includes('vitamin') || lower.includes('medicine')) return CATEGORY_MAP['Health & Medical'];
    if (lower.includes('pet') || lower.includes('dog') || lower.includes('cat') || lower.includes('animal')) return CATEGORY_MAP['Pet Supplies'];
    if (lower.includes('industrial') || lower.includes('tool') || lower.includes('hardware') || lower.includes('power tool')) return CATEGORY_MAP['Industrial & Tools'];
    if (lower.includes('digital') || lower.includes('software') || lower.includes('course') || lower.includes('subscription')) return CATEGORY_MAP['Digital Products'];
    if (lower.includes('grocery') || lower.includes('fruit') || lower.includes('vegetable') || lower.includes('dairy')) return CATEGORY_MAP['Groceries'];
    if (lower.includes('electron') || lower.includes('mobile') || lower.includes('phone') || lower.includes('computer') || lower.includes('monitor')) return CATEGORY_MAP['Electronics'];
    if (lower.includes('shoe') || lower.includes('sandal') || lower.includes('slipper') || lower.includes('footwear')) return CATEGORY_MAP['Footwear'];
    if (lower.includes('bag') || lower.includes('wallet') || lower.includes('belt') || lower.includes('sunglass') || lower.includes('accessor')) return CATEGORY_MAP['Accessories'];
    if (lower.includes('fashion') || lower.includes('cloth') || lower.includes('wear')) return CATEGORY_MAP['Fashion'];
    if (lower.includes('home') || lower.includes('kitchen') || lower.includes('furniture') || lower.includes('decor')) return CATEGORY_MAP['Home & Kitchen'];
    if (lower.includes('game') || lower.includes('gaming') || lower.includes('puzzle') || lower.includes('rc toy')) return CATEGORY_MAP['Gaming'];
    if (lower.includes('travel') || lower.includes('hotel') || lower.includes('flight') || lower.includes('luggage')) return CATEGORY_MAP['Travel'];
    if (lower.includes('car') || lower.includes('auto') || lower.includes('bike') || lower.includes('tyre')) return CATEGORY_MAP['Automotive'];
    
    // Default
    return { icon: Package, bg: 'bg-slate-50', icon_color: 'text-slate-500', border: 'border-slate-200', shadow: 'shadow-slate-500/5' };
};
