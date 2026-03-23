# DealOrbit E-commerce Platform

A high-performance, SEO-optimized affiliate deals platform built with React, Node.js, and Puppeteer SSR.

## 🚀 Simplified Manual Workflow

The platform has been streamlined for stability and ease of management. Product addition is strictly manual through the Admin Panel.

### How to Add a New Deal:
1.  **Admin Panel**: Navigate to `Admin Panel` -> `Add Deal`.
2.  **Paste Link**: Paste the product URL from any supported e-commerce site (Amazon, Flipkart, Ajio, Meesho, etc.).
3.  **Smart Fetch**: The system will automatically extract product details (Title, Price, Original Price, Image, Discount) but will NOT save it yet.
4.  **Review & Refine**: Review the extracted data. You can manually edit any field or choose a different image from the extracted gallery.
5.  **Publish**: Click **Publish Deal** to go live. New deals are instantly broadcast to all users via Socket.io.

## 🛠 Tech Stack
-   **Frontend**: React, Tailwind CSS, Framer Motion, Lucide Icons.
-   **Backend**: Node.js, Express, Mongoose.
-   **Real-time**: Socket.io for instant updates.
-   **SEO**: Global SSR Engine using Puppeteer for high-fidelity source code.
-   **Performance**: LocalStorage caching and image optimization.

## 🏗 Setup & Run
```bash
# Install dependencies (Root and Server)
npm run install-all

# Start development server (Fronted + Backend)
npm run dev
```

---
*Simplified for Efficiency. Powered by Intelligence.*
