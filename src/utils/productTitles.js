const MAX_CARD_CHARS = 58;
const MAX_DETAIL_CHARS = 118;

const PROMO_REGEX = /\b(?:free delivery|cash on delivery|no cost emi|bank offer|exchange offer|limited time|best price|lowest price|sale|deal|discount|coupon|cashback|hot deal|special offer|plug and play|buy online|online at best price|with offers?|inclusive of all taxes|tax included)\b/gi;

const NOISE_BRACKET_REGEX = /\[(?:.*?)\]|\{(?:.*?)\}/g;
const PRICE_REGEX = /(?:₹|rs\.?|inr|\$)\s?\d[\d,]*(?:\.\d+)?/gi;
const RATING_REGEX = /\b\d(?:\.\d)?\s?(?:star|stars|rating)\b/gi;
const SEPARATOR_REGEX = /\s*(?:\||•|·|;|\/{2,})\s*/g;

const IMPORTANT_SPEC_REGEX = /\b(?:\d+\s?(?:gb|tb|mb|mah|w|hz|inch|inches|cm|mm|ml|l|kg|g|hrs?|hours?|mp|v)|(?:anc|enc|tws|oled|amoled|hd|fhd|uhd|4k|5g|wifi|wireless|wired|bluetooth|usb|type-?c|ipx?\d+|dolby|ssd|ram|rom|gen\s?\d+|series\s?\d+))\b/i;

const COLOR_OR_VARIANT_REGEX = /\(([^)]{2,34})\)$/;

const STOP_SEGMENT_REGEX = /\b(?:warranty|compatible with|for all|for home|for office|for men and women|ideal for|made for|suitable for|used for)\b/i;

const BRAND_FIXES = new Map([
  ['boat', 'boAt'],
  ['goboult', 'GOBOULT'],
  ['boult', 'Boult'],
  ['moto', 'moto'],
  ['xiaomi', 'Xiaomi'],
  ['hp', 'HP'],
  ['dell', 'Dell'],
  ['philips', 'PHILIPS'],
  ['usb', 'USB'],
  ['tws', 'TWS'],
  ['anc', 'ANC'],
  ['enc', 'ENC'],
  ['hd', 'HD'],
  ['oled', 'OLED'],
  ['amoled', 'AMOLED'],
  ['ssd', 'SSD'],
  ['gb', 'GB'],
  ['tb', 'TB']
]);

const normalizeSpaces = (value = '') =>
  String(value)
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const removeRepeatedWords = (value = '') => {
  const words = normalizeSpaces(value).split(' ');
  const output = [];
  words.forEach((word) => {
    const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    const prev = output[output.length - 1] || '';
    const prevNormalized = prev.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized && normalized === prevNormalized) return;
    output.push(word);
  });
  return output.join(' ');
};

const cleanSegment = (value = '') =>
  removeRepeatedWords(
    normalizeSpaces(value)
      .replace(NOISE_BRACKET_REGEX, ' ')
      .replace(PRICE_REGEX, ' ')
      .replace(RATING_REGEX, ' ')
      .replace(PROMO_REGEX, ' ')
      .replace(/\b(?:black|white|blue|green|red|pink|gold|silver|grey|gray)\s+colour\b/gi, '$1')
      .replace(/[™®©]/g, '')
      .replace(/[_*#]+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .replace(/^[,.\-\s]+|[,.\-\s]+$/g, '')
  );

const smartCaseWord = (word = '') => {
  const bare = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (BRAND_FIXES.has(bare)) {
    return word.replace(new RegExp(bare, 'i'), BRAND_FIXES.get(bare));
  }
  return word;
};

const smartBrandCase = (value = '') =>
  value
    .split(' ')
    .map(smartCaseWord)
    .join(' ');

const splitTitleSegments = (title = '') =>
  normalizeSpaces(title)
    .replace(SEPARATOR_REGEX, ' | ')
    .split(/\s+\|\s+|(?<=\w),\s+/)
    .map(cleanSegment)
    .filter((segment) => segment && segment.length > 1 && !STOP_SEGMENT_REGEX.test(segment));

const truncateAtWord = (value = '', maxChars = 80, maxWords = 14) => {
  const words = normalizeSpaces(value).split(' ').filter(Boolean);
  const chosen = [];

  for (const word of words) {
    const candidate = [...chosen, word].join(' ');
    if (chosen.length >= maxWords || candidate.length > maxChars) break;
    chosen.push(word);
  }

  const result = chosen.join(' ');
  const polishedResult = result.replace(/\s+(?:with|and|for|of|by|to)$/i, '');
  return result && result.length < normalizeSpaces(value).length
    ? polishedResult.replace(/[,\-.]+$/g, '')
    : normalizeSpaces(value).replace(/\s+(?:with|and|for|of|by|to)$/i, '');
};

const compactTitle = (rawTitle = '', { maxChars, maxWords, includeSpecs }) => {
  const segments = splitTitleSegments(rawTitle);
  if (!segments.length) return 'Product Deal';

  const core = segments[0];
  const coreParenthetical = core.match(COLOR_OR_VARIANT_REGEX)?.[0] || '';
  const usefulSpecs = includeSpecs
    ? segments
        .slice(1)
        .filter((segment) => IMPORTANT_SPEC_REGEX.test(segment))
        .slice(0, 2)
    : [];

  let candidate = [core, ...usefulSpecs].join(' | ');
  candidate = cleanSegment(candidate);

  if (coreParenthetical && !candidate.includes(coreParenthetical)) {
    candidate = `${candidate} ${coreParenthetical}`;
  }

  return smartBrandCase(truncateAtWord(candidate, maxChars, maxWords));
};

export const getCardTitle = (rawTitle = '') =>
  compactTitle(rawTitle, {
    maxChars: MAX_CARD_CHARS,
    maxWords: 9,
    includeSpecs: false
  });

export const getDisplayTitle = (rawTitle = '') =>
  compactTitle(rawTitle, {
    maxChars: MAX_DETAIL_CHARS,
    maxWords: 18,
    includeSpecs: true
  });

export const createProductTitleSet = (rawTitle = '') => {
  const originalTitle = normalizeSpaces(rawTitle);
  const displayTitle = getDisplayTitle(originalTitle);
  const cardTitle = getCardTitle(originalTitle);

  return {
    originalTitle,
    rawTitle: originalTitle,
    displayTitle,
    cardTitle
  };
};
