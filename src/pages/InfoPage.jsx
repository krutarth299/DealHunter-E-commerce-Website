import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const PAGE_CONTENT = {
    about: {
        title: 'About DealSphere',
        eyebrow: 'About',
        description: 'Learn how DealSphere helps shoppers discover verified deals, live offers, and trustworthy savings across top stores.',
        sections: [
            {
                heading: 'What DealSphere Does',
                body: 'DealSphere brings together live product deals, coupons, and store-level offers in one place so shoppers can compare value quickly and make better buying decisions.'
            },
            {
                heading: 'How We Curate Deals',
                body: 'We validate pricing, remove low-quality records, attach affiliate tracking rules cleanly, and keep public pages focused on real, current offers instead of placeholder content.'
            },
            {
                heading: 'Our Focus',
                body: 'The platform is built for speed, trust, and discovery across electronics, fashion, beauty, home, pharmacy, grocery, and other high-intent shopping categories.'
            }
        ]
    },
    contact: {
        title: 'Contact DealSphere',
        eyebrow: 'Contact',
        description: 'Reach the DealSphere team for support, partnership questions, data issues, or general feedback.',
        sections: [
            {
                heading: 'Support',
                body: 'For deal issues, coupon corrections, or broken merchant links, contact the support team at support@dealsphere.com.'
            },
            {
                heading: 'Partnerships',
                body: 'For affiliate, brand, or store partnership requests, email partnerships@dealsphere.com with your store details and program information.'
            },
            {
                heading: 'Response Expectations',
                body: 'We review inbound requests as quickly as possible and prioritize merchant-link issues, pricing corrections, and indexing or trust-related concerns.'
            }
        ]
    },
    privacy: {
        title: 'Privacy Policy',
        eyebrow: 'Privacy',
        description: 'Understand how DealSphere handles analytics, affiliate tracking, and visitor data responsibly.',
        sections: [
            {
                heading: 'Data Collection',
                body: 'DealSphere may collect limited usage information such as page views, click activity, and device context to improve site performance, analytics, and affiliate tracking accuracy.'
            },
            {
                heading: 'Affiliate Tracking',
                body: 'Some outbound links contain affiliate parameters so purchases can be attributed correctly. These links help support the platform without changing the merchant price shown on our site.'
            },
            {
                heading: 'Your Choices',
                body: 'You can control cookies and browser storage from your browser settings. If you contact us, we only use the information you share to respond to your request.'
            }
        ]
    },
    terms: {
        title: 'Terms of Service',
        eyebrow: 'Terms',
        description: 'Review the basic terms for using DealSphere, including affiliate disclosure and content usage expectations.',
        sections: [
            {
                heading: 'Information Accuracy',
                body: 'We work to keep deal and coupon data current, but merchant pricing and availability can change at any time. Final purchase terms always belong to the destination store.'
            },
            {
                heading: 'Affiliate Disclosure',
                body: 'DealSphere may earn a commission when users click or purchase through affiliate links. This supports the platform and helps us maintain deal discovery and verification systems.'
            },
            {
                heading: 'Platform Usage',
                body: 'Users should not misuse the platform, attempt to disrupt service availability, or rely on outdated offers after a merchant has changed or removed them.'
            }
        ]
    }
};

const InfoPage = ({ page = 'about', onSearch, setIsAddDealOpen, wishlist = [], showToast }) => {
    const content = PAGE_CONTENT[page] || PAGE_CONTENT.about;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <SEO
                title={content.title}
                description={content.description}
                canonical={`/${page === 'privacy' ? 'privacy-policy' : page}`}
            />
            <Navbar
                user={null}
                onSearch={onSearch}
                onAddDealClick={() => setIsAddDealOpen?.(true)}
                wishlistCount={wishlist?.length ?? 0}
                wishlist={wishlist}
            />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                <section className="mx-auto max-w-4xl rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm sm:p-10">
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-orange-600">{content.eyebrow}</p>
                    <h1 className="max-w-3xl text-[clamp(2rem,4vw,3.25rem)] font-black tracking-tight text-slate-950 leading-[1.05]">
                        {content.title}
                    </h1>
                    <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-500 sm:text-base">
                        {content.description}
                    </p>

                    <div className="mt-10 grid gap-5">
                        {content.sections.map((section) => (
                            <article key={section.heading} className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-6">
                                <h2 className="text-lg font-black tracking-tight text-slate-950">{section.heading}</h2>
                                <p className="mt-3 text-sm font-medium leading-7 text-slate-600 sm:text-[15px]">
                                    {section.body}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>
            </main>
            <Footer showToast={showToast} />
        </div>
    );
};

export default InfoPage;
