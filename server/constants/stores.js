/**
 * Standard store identifiers and constants
 */
export const STORES = {
    FLIPKART: 'Flipkart',
    AMAZON: 'Amazon',
    MYNTRA: 'Myntra',
    CROMA: 'Croma',
    TATA_CLIQ: 'TataCliq',
    NYKAA: 'Nykaa',
    RELIANCE_DIGITAL: 'Reliance Digital'
};

export const STORE_NAMES = Object.values(STORES);

export const PRICING_LABELS = {
    FLIPKART: {
        MRP: 'MRP (Incl. of all taxes)',
        DEAL: 'Total Amount'
    },
    AMAZON: {
        MRP: ['M.R.P.', 'List Price', 'Typical price'],
        DEAL: ['.a-price-whole', '.a-offscreen']
    }
};
