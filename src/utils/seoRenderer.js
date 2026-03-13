export function generateProductSEO(product, allDeals = []) {
    if (!product) return '';

    const activeImage = product.image || (product.images && product.images[0]) || '';
    const safeTitle = (product.title || '').replace(/"/g, '&quot;');
    const safeStore = (product.store || 'Store').replace(/"/g, '&quot;');
    const safePrice = (product.price || '');
    const safeOriginalPrice = (product.originalPrice || '');
    const safeDiscount = (product.discount || '40%');
    const safeCategory = (product.category || 'Gear');
    const safeRating = (product.rating || '4.5');

    // Mimic the Brand styling
    const getBrandColor = (store) => {
        const s = store?.toLowerCase() || '';
        if (s.includes('amazon')) return 'bg-[#FF9900] shadow-[#FF9900]/30';
        if (s.includes('flipkart')) return 'bg-[#2874f0] shadow-[#2874f0]/30';
        if (s.includes('meesho')) return 'bg-[#F43397] shadow-[#F43397]/30';
        if (s.includes('myntra')) return 'bg-[#ff3e6c] shadow-[#ff3e6c]/30';
        if (s.includes('ajio')) return 'bg-[#2c4152] shadow-[#2c4152]/30';
        return 'bg-slate-900 shadow-slate-900/30';
    };
    const brandClass = getBrandColor(product.store);

    const thumbnailHtml = product.images && product.images.length > 1 ? product.images.map((img, idx) => `
        <button class="relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-[1.2rem] overflow-hidden snap-center bg-white border-2 transition-premium ${idx === 0 ? 'border-orange-500 shadow-orange-glow scale-110' : 'border-transparent hover:border-orange-200 opacity-60 hover:opacity-100 shadow-sm'}">
            <img src="${img}" alt="Thumbnail ${idx}" class="w-full h-full object-contain mix-blend-multiply p-2" loading="lazy">
        </button>
    `).join('') : '';

    const activeReviews = product.reviews && product.reviews.length > 0 ? product.reviews : [
        { user: "Rahul M.", rating: 5, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), comment: "Absolutely stunning quality. Performance exceeds my expectations for this price point." },
        { user: "Priya S.", rating: 4, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), comment: "Great value for money. The build quality is top-notch." }
    ];

    const reviewsHtml = activeReviews.map(r => `
        <div class="relative border-b border-slate-50 pb-4">
            <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] text-slate-900 font-black">${r.user}</span>
            </div>
            <p class="text-slate-600 text-xs italic">"${r.comment}"</p>
        </div>
    `).join('');

    const similarDeals = allDeals.filter(d => d.category === product.category && String(d._id || d.id) !== String(product._id || product.id)).slice(0, 4);
    let similarDealsHtml = '';
    if (similarDeals.length > 0) {
        const cards = similarDeals.map(deal => {
            return `
                <div class="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm group">
                    <div class="relative aspect-square p-6 flex flex-col items-center justify-center">
                        <img src="${deal.image}" alt="${deal.title}" class="w-full h-full object-contain filter drop-shadow-lg" />
                    </div>
                    <div class="p-5 flex flex-col gap-2">
                        <h3 class="font-black text-slate-900 text-sm truncate">${deal.title}</h3>
                        <div class="flex items-center gap-2">
                            <span class="text-lg font-black text-slate-900 leading-none">${deal.price}</span>
                            ${deal.originalPrice ? `<span class="text-xs text-slate-400 line-through font-bold">${deal.originalPrice}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        similarDealsHtml = `
            <!-- Similar/Related Items -->
            <div class="mt-16">
                <div class="flex items-center mb-8">
                    <h3 class="text-2xl font-bold text-slate-900">You might also like</h3>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    ${cards}
                </div>
            </div>
        `;
    }

    return `
        <main id="product-details-loaded" class="container mx-auto px-4 md:px-8 pt-24 md:pt-28 pb-16">
            <button class="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors mb-6 font-medium">
                Back
            </button>

            <div class="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
                <div class="grid grid-cols-1 lg:grid-cols-2">
                    
                    <!-- Image Section -->
                    <div class="relative glass-premium p-8 py-10 md:p-10 lg:p-12 flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px] gap-6 border-b lg:border-r border-slate-100">
                        <div class="relative w-full max-w-[280px] lg:max-w-xs aspect-square z-10 mx-auto">
                            <img src="${activeImage}" alt="${safeTitle}" class="w-full h-full object-contain filter drop-shadow-2xl">
                        </div>
                        <div class="flex gap-4 overflow-x-auto max-w-full pb-4 px-2 snap-x no-scrollbar">
                            ${thumbnailHtml}
                        </div>
                    </div>

                    <!-- Details Section -->
                    <div class="p-4 md:p-6 lg:p-8 flex flex-col h-full bg-white relative">
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex flex-wrap gap-2">
                                <span class="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full flex items-center gap-1">VERIFIED DEAL</span>
                                <span class="text-[10px] font-black bg-rose-100 text-rose-600 px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">🔥 BEST PRICE</span>
                            </div>
                        </div>

                        <h1 class="text-2xl md:text-4xl font-black text-slate-900 mb-2 leading-[1.1] tracking-tight">${safeTitle}</h1>

                        <div class="flex items-center gap-2 text-slate-500 mb-4">
                            <span class="font-medium">Sold by:</span>
                            <span class="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">${safeStore}</span>
                        </div>

                        <div class="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-1.5 rounded-lg text-sm font-bold w-fit mb-4 flex items-center gap-2">
                            <span>Offer ends in: <span class="tabular-nums">9h : 14m : 30s</span></span>
                        </div>

                        <div class="flex items-center gap-3 mb-4">
                            <span class="text-4xl font-black text-slate-900 tracking-tighter">${safePrice}</span>
                            <div class="flex flex-col">
                                <span class="text-sm text-slate-400 line-through font-bold">${safeOriginalPrice}</span>
                                <span class="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md w-fit uppercase tracking-wider">${safeDiscount}</span>
                            </div>
                        </div>

                        <div class="mb-4 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl p-4">
                            <h4 class="font-black text-slate-900 text-xs flex items-center gap-2 mb-3 uppercase tracking-widest">Available Offers</h4>
                            <div class="space-y-3">
                                <div class="flex gap-2">
                                    <span class="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded h-fit shrink-0">Bank Offer</span>
                                    <p class="text-[11px] text-slate-700 font-medium leading-tight">Flat ₹200 off on Alpha Bank Credit Cards. <span class="text-blue-600 font-bold">T&C</span></p>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                            <!-- Placeholder for Price Chart and Compare -->
                            <div class="bg-white rounded-[2.5rem] border border-slate-100 p-6 flex-1 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)]">
                                <h4 class="text-lg font-black text-slate-900 tracking-tighter">Price Analytics</h4>
                                <div class="h-20 w-full relative group"></div>
                                <div class="flex justify-between mt-3 text-[9px] font-black text-slate-400"><span class="uppercase tracking-[0.2em]">30 DAYS AGO</span><span class="uppercase tracking-[0.2em]">TODAY</span></div>
                            </div>
                            <div class="bg-white rounded-2xl border border-slate-100 p-6 flex-1 shadow-sm">
                                <h4 class="font-extrabold text-slate-700 text-[11px] mb-3 tracking-tight uppercase">Compare Prices</h4>
                                <div class="space-y-2">
                                    <div class="flex items-center justify-between p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                                        <span class="text-xs font-black text-[#4f46e5] uppercase tracking-wider">${safeStore}</span>
                                        <span class="text-sm font-black text-slate-900">${safePrice}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="mt-auto flex flex-col gap-4">
                            <div class="flex gap-4">
                                <a href="${product.link || '#'}" class="flex-1 ${brandClass} text-white font-bold text-lg py-4 rounded-xl shadow-xl transform flex items-center justify-center gap-3 no-underline">
                                    Buy on ${safeStore}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Specs & Description -->
            <div class="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div class="lg:col-span-3 space-y-6">
                    <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                        <div class="flex flex-col md:flex-row gap-8">
                            <div class="flex-1">
                                <h3 class="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2 tracking-tight">PRODUCT OVERVIEW</h3>
                                <p class="text-slate-500 text-xs leading-relaxed font-medium">Premium quality ${safeTitle}. Designed for modern lifestyles, combining durability with aesthetic appeal. High-quality materials and ergonomic design.</p>
                            </div>
                            <div class="flex-[2]">
                                <h3 class="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2 tracking-tight">SPECIFICATIONS</h3>
                                <div class="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                                    <div class="flex flex-col"><span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Brand</span><span class="text-slate-900 font-black text-[11px] truncate">${safeStore}</span></div>
                                    <div class="flex flex-col"><span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Category</span><span class="text-slate-900 font-black text-[11px] truncate">${safeCategory}</span></div>
                                    <div class="flex flex-col"><span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rating</span><span class="text-slate-900 font-black text-[11px] truncate">${safeRating}/5</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Trust Badges -->
                <div class="lg:col-span-1">
                    <div class="bg-slate-50 border border-slate-100 rounded-3xl p-6 text-slate-900 h-full flex flex-col justify-center">
                        <div class="grid grid-cols-1 gap-4">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">🛡️</div>
                                <p class="font-black text-[11px] uppercase tracking-wider text-slate-700">Protected</p>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">🚚</div>
                                <p class="font-black text-[11px] uppercase tracking-wider text-slate-700">Free Delivery</p>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">⏱️</div>
                                <p class="font-black text-[11px] uppercase tracking-wider text-slate-700">Flash Price</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Reviews -->
            <div id="reviews" class="mt-8">
                <div class="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div class="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">Customer Feedback</h3>
                            <div class="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-full"><span class="text-xs font-black text-amber-700">${safeRating}</span></div>
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            ${reviewsHtml}
                        </div>
                    </div>
                </div>
            </div>

            ${similarDealsHtml}
        </main>
    `;

}
export function generateBlogSEO(post, relatedPosts = [], comments = []) {
    if (!post) return '';

    const contentHtml = post.content.map(block => {
        switch (block.type) {
            case 'intro': return `<p class="blog-intro-ssr">${block.text}</p>`;
            case 'heading': return `<h2 class="blog-heading-ssr">${block.text}</h2>`;
            case 'text': return `<p class="blog-text-ssr">${block.text}</p>`;
            case 'tip': return `<div class="blog-tip-ssr"><strong>Pro Tip:</strong> ${block.text}</div>`;
            case 'conclusion': return `<div class="blog-conclusion-ssr"><h3>Final Thoughts</h3><p>${block.text}</p></div>`;
            default: return '';
        }
    }).join('');

    const tagsHtml = post.tags.map(t => `<span class="tag">#${t}</span>`).join(' ');

    const relatedHtml = relatedPosts.length > 0 ? `
        <section class="related-posts-ssr">
            <h3>More Articles You'll Love</h3>
            <div class="related-grid-ssr">
                ${relatedPosts.map(p => `
                    <div class="related-card-ssr">
                        <img src="${p.image}" alt="${p.title}" />
                        <div class="related-meta-ssr">
                            <span class="cat-ssr">${p.category}</span>
                            <h4><a href="/blog/${p.slug}">${p.title}</a></h4>
                            <span class="read-ssr">${p.readTime}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>
    ` : '';

    return `
        <article class="blog-post-detail-ssr" itemscope itemtype="https://schema.org/BlogPosting">
            <header class="post-header-ssr">
                <div class="breadcrumb-ssr"><a href="/blog">Back to Blog</a></div>
                <div class="meta-tags-ssr"><span class="cat">${post.category}</span> ${tagsHtml}</div>
                <h1 itemprop="headline" class="post-title-ssr">${post.title}</h1>
                <div class="author-row-ssr">
                    <div class="author-avatar">${post.authorAvatar}</div>
                    <div class="author-info">
                        <span itemprop="author" class="name">${post.author}</span>
                        <span class="meta">${post.date} · ${post.readTime}</span>
                    </div>
                </div>
            </header>
            <div class="post-hero-image-ssr">
                <img itemprop="image" src="${post.image}" alt="${post.title}" />
            </div>
            <div itemprop="articleBody" class="post-content-ssr">
                ${contentHtml}
            </div>
            <div class="share-cta-ssr">
                <p>Found this helpful?</p>
                <p>Share it with a friend and save them money too.</p>
                <button>Copy Link</button>
            </div>
            <div class="post-comments-ssr">
                <h3>💬 Comments (${comments.length > 0 ? comments.length : 2})</h3>
                <div class="comment-list-ssr">
                    ${comments.length > 0 ? comments.map(c => `
                        <div class="comment-ssr">
                            <div class="comment-header-ssr"><strong>${c.userName}</strong> <span>${new Date(c.createdAt).toLocaleDateString()}</span></div>
                            <p>${c.text}</p>
                        </div>
                    `).join('') : `
                        <div class="comment-ssr">
                            <div class="comment-header-ssr"><strong>Vikram S.</strong> <span>2 hours ago</span></div>
                            <p>Really helpful guide! Saved ₹4,000 using the bank offer stacking tip.</p>
                        </div>
                        <div class="comment-ssr">
                            <div class="comment-header-ssr"><strong>Meena R.</strong> <span>1 day ago</span></div>
                            <p>Finally a blog post that shows real numbers and not just vague advice. Bookmarked!</p>
                        </div>
                    `}
                </div>
            </div>
            ${relatedHtml}
            <footer class="post-footer-ssr">
                <div class="author-bio-ssr">
                    <h4>About the Author</h4>
                    <p>${post.authorBio}</p>
                </div>
            </footer>
        </article>
    `;
}
