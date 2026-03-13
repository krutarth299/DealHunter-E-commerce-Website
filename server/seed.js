require('dotenv').config();
const mongoose = require('mongoose');
const Deal = require('./models/Deal');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const INITIAL_DEALS = [
    {
        title: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
        store: "Amazon",
        price: "₹24,990",
        originalPrice: "₹29,990",
        discount: "17% OFF",
        image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&auto=format&fit=crop&q=80",
        rating: 4.8,
        category: "Electronics"
    },
    {
        title: "Samsung Galaxy Watch 6 - 44mm Bluetooth",
        store: "Flipkart",
        price: "₹19,999",
        originalPrice: "₹32,999",
        discount: "40% OFF",
        image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80",
        rating: 4.5,
        category: "Electronics"
    },
    {
        title: "Nike Air Jordan 1 Retro High OG",
        store: "Myntra",
        price: "₹13,500",
        originalPrice: "₹16,995",
        discount: "20% OFF",
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
        rating: 4.9,
        category: "Fashion"
    },
    {
        title: "MacBook Air M2 Chip - 256GB SSD",
        store: "Croma",
        price: "₹92,900",
        originalPrice: "₹1,14,900",
        discount: "19% OFF",
        image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=800&auto=format&fit=crop&q=80",
        rating: 4.7,
        category: "Electronics"
    },
    {
        title: "Puma Men's Running Shoes - Black/White",
        store: "Ajio",
        price: "₹1,999",
        originalPrice: "₹4,999",
        discount: "60% OFF",
        image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop&q=80",
        rating: 4.2,
        category: "Fashion"
    },
    {
        title: "Echo Dot (5th Gen) | Smart speaker with Alexa",
        store: "Amazon",
        price: "₹4,499",
        originalPrice: "₹5,499",
        discount: "18% OFF",
        image: "https://images.unsplash.com/photo-1543512214-318c77a07298?w=800&auto=format&fit=crop&q=80",
        rating: 4.6,
        category: "Electronics"
    },
    {
        title: "Ray-Ban Aviator Classic Sunglasses",
        store: "Myntra",
        price: "₹6,392",
        originalPrice: "₹7,990",
        discount: "20% OFF",
        image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80",
        rating: 4.4,
        category: "Fashion"
    },
    {
        title: "Instant Pot 7-in-1 Electric Pressure Cooker",
        store: "Amazon",
        price: "₹8,499",
        originalPrice: "₹11,999",
        discount: "29% OFF",
        image: "https://images.unsplash.com/photo-1588645398255-a43e4984ea89?w=800&auto=format&fit=crop&q=80",
        rating: 4.7,
        category: "Home"
    },
    {
        title: "Apple AirPods Pro (2nd Gen)",
        store: "Amazon",
        price: "₹18,990",
        originalPrice: "₹26,900",
        discount: "29% OFF",
        image: "https://images.unsplash.com/photo-1628210889224-53b2e308bb63?w=800&auto=format&fit=crop&q=80",
        rating: 4.9,
        category: "Electronics"
    },
    {
        title: "Levi's Men's 511 Slim Fit Jeans",
        store: "Myntra",
        price: "₹1,599",
        originalPrice: "₹2,899",
        discount: "45% OFF",
        image: "https://images.unsplash.com/photo-1542272617-08f086305042?w=800&auto=format&fit=crop&q=80",
        rating: 4.3,
        category: "Fashion"
    },
    {
        title: "Fitbit Charge 6 Fitness Tracker",
        store: "Croma",
        price: "₹12,499",
        originalPrice: "₹14,999",
        discount: "17% OFF",
        image: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&auto=format&fit=crop&q=80",
        rating: 4.5,
        category: "Electronics"
    },
    {
        title: "Philips Air Fryer HD9200/90",
        store: "Amazon",
        price: "₹6,999",
        originalPrice: "₹9,995",
        discount: "30% OFF",
        image: "https://images.unsplash.com/photo-1626152868117-64670cbdf0f4?w=800&auto=format&fit=crop&q=80",
        rating: 4.6,
        category: "Home"
    },
    {
        title: "H&M Women's Cotton T-Shirt",
        store: "Myntra",
        price: "₹399",
        originalPrice: "₹799",
        discount: "50% OFF",
        image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop&q=80",
        rating: 4.2,
        category: "Fashion"
    },
    {
        title: "OnePlus 11R 5G (16GB RAM)",
        store: "Amazon",
        price: "₹44,999",
        originalPrice: "₹49,999",
        discount: "10% OFF",
        image: "https://images.unsplash.com/photo-1598327774645-84b34563d484?w=800&auto=format&fit=crop&q=80",
        rating: 4.8,
        category: "Electronics"
    },
    {
        title: "Wonderchef Nutri-Blend Mixer Grinder",
        store: "Flipkart",
        price: "₹2,699",
        originalPrice: "₹5,000",
        discount: "46% OFF",
        image: "https://images.unsplash.com/photo-1570222094114-28a9d88a27e6?w=800&auto=format&fit=crop&q=80",
        rating: 4.4,
        category: "Home"
    },
    {
        title: "Fossil Gen 6 Smartwatch",
        store: "Amazon",
        price: "₹11,995",
        originalPrice: "₹23,995",
        discount: "50% OFF",
        image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80",
        rating: 4.3,
        category: "Electronics"
    }
];

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('MongoDB Connected');

        // Seed Deals
        await Deal.deleteMany({});
        console.log('Cleared existing deals');
        await Deal.insertMany(INITIAL_DEALS);
        console.log('Deals Seeded');

        // Seed Admin User
        await User.deleteMany({}); // Optional: Clear users to reset
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const adminUser = new User({
            name: "Admin User",
            email: "admin@example.com",
            password: hashedPassword,
            role: "admin"
        });

        await adminUser.save();
        console.log('Admin User Seeded: admin@example.com / admin123');

        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
