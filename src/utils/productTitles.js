const MAX_CARD_CHARS = 64;
const MAX_DETAIL_CHARS = 82;

const PROMO_REGEX = /\b(?:buy now|shop now|best price|best offer|online|india|limited offer|limited time|free delivery|cash on delivery|cod|no cost emi|bank offer|exchange offer|sale|deal|discount|coupon|cashback|special offer|hot deal|lowest price|offer price|online at best price|with offers?|inclusive of all taxes|tax included|get it now)\b/gi;
const NOISE_BRACKET_REGEX = /\[(?:.*?)\]|\{(?:.*?)\}/g;
const PRICE_REGEX = /(?:rs\.?|inr|\$)\s?\d[\d,]*(?:\.\d+)?/gi;
const RATING_REGEX = /\b\d(?:\.\d)?\s?(?:star|stars|rating)\b/gi;
const SEPARATOR_REGEX = /\s*(?:\||;|\/{2,})\s*/g;
const STOP_SEGMENT_REGEX = /\b(?:warranty|compatible with|for all|for home|for office|for men and women|ideal for|made for|suitable for|used for|original|genuine|official)\b/i;
const TRIM_TRAILING_CONNECTOR_REGEX = /\s+(?:with|and|for|of|by|to|in|on)$/i;
const REMOVE_FROM_CARD_REGEX = /\b(?:bluetooth|wireless|smart|android|windows\s?11)\b/gi;

const PRODUCT_TYPE_REGEX = /\b(?:smartphone|phone|mobile|laptop|notebook|tablet|smartwatch|watch|earbuds|earphones|headphones|speaker|soundbar|tv|television|monitor|camera|printer|router|refrigerator|washing machine|air conditioner|ac|trimmer|shoe|shoes|sneakers|sandals|kurta|shirt|dress|jeans|saree|bag|backpack|sofa|mattress|chair|bottle|mixer|grinder|cookware|face wash|serum|lipstick|moisturizer)\b/i;
const SPEC_TOKEN_REGEX = /(?:\b\d+\s?(?:gb|tb|mb|w|hz|inch|inches|cm|mm|ml|l|kg|g|mp)\b|\b(?:i[3579]|ryzen\s?[3579]|gen\s?\d+|snapdragon\s?\d+|dimensity\s?\d+|5g|4g|wifi|wireless|bluetooth|anc|enc|tws|oled|amoled|fhd|uhd|4k|ssd|ram|rom|type-?c|ipx?\d+|windows\s?11)\b)/i;
const STORAGE_PAIR_REGEX = /\b\d+\s?gb\s*\/\s*\d+\s?gb\b/i;
const MODEL_REGEX = /\b(?:[A-Za-z]{1,4}-?[A-Za-z0-9]{2,}|\d{2,}[A-Za-z][A-Za-z0-9-]*)\b/;
const COLOR_REGEX = /\b(?:midnight|starlight|blue|black|white|green|red|pink|gold|silver|grey|gray|purple|yellow|orange|navy|beige|brown)\b/i;
const EMPTY_VARIANT_REGEX = /^\(?\s*(?:color|colour|size|variant)\s*\)?$/i;

const BRAND_FIXES = new Map([
  ['boat', 'boAt'],
  ['goboult', 'GOBOULT'],
  ['boult', 'Boult'],
  ['moto', 'moto'],
  ['xiaomi', 'Xiaomi'],
  ['hp', 'HP'],
  ['dell', 'Dell'],
  ['lenovo', 'Lenovo'],
  ['asus', 'ASUS'],
  ['acer', 'Acer'],
  ['msi', 'MSI'],
  ['lg', 'LG'],
  ['oppo', 'OPPO'],
  ['vivo', 'vivo'],
  ['realme', 'realme'],
  ['iqoo', 'iQOO'],
  ['nothing', 'Nothing'],
  ['philips', 'PHILIPS'],
  ['sony', 'Sony'],
  ['jbl', 'JBL'],
  ['cpu', 'CPU'],
  ['gpu', 'GPU'],
  ['usb', 'USB'],
  ['tws', 'TWS'],
  ['anc', 'ANC'],
  ['enc', 'ENC'],
  ['hd', 'HD'],
  ['fhd', 'FHD'],
  ['uhd', 'UHD'],
  ['oled', 'OLED'],
  ['amoled', 'AMOLED'],
  ['ssd', 'SSD'],
  ['ram', 'RAM'],
  ['rom', 'ROM'],
  ['gb', 'GB'],
  ['tb', 'TB'],
  ['mah', 'mAh'],
  ['wifi', 'WiFi']
]);

const normalizeSpaces = (value = '') =>
  String(value)
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeToken = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const dedupeSequentialWords = (value = '') => {
  const words = normalizeSpaces(value).split(' ');
  const output = [];
  for (const word of words) {
    const normalized = normalizeToken(word);
    const previous = normalizeToken(output[output.length - 1] || '');
    if (normalized && normalized === previous) continue;
    output.push(word);
  }
  return output.join(' ');
};

const dedupeSlidingPhrases = (value = '') => {
  const words = normalizeSpaces(value).split(' ').filter(Boolean);
  if (words.length < 4) return words.join(' ');

  const result = [];
  for (const word of words) {
    result.push(word);
    if (result.length >= 4) {
      const tail = result.slice(-2).map(normalizeToken).join(' ');
      const prior = result.slice(0, -2).map(normalizeToken).join(' ');
      if (tail && prior.includes(tail)) {
        result.splice(-2, 2);
      }
    }
  }
  return result.join(' ');
};

const stripNoise = (value = '') =>
  normalizeSpaces(value)
    .replace(NOISE_BRACKET_REGEX, ' ')
    .replace(PRICE_REGEX, ' ')
    .replace(RATING_REGEX, ' ')
    .replace(PROMO_REGEX, ' ')
    .replace(/[_*#]+/g, ' ')
    .replace(/\b\d+\s?mah\s+battery\b/gi, ' ')
    .replace(/\bbattery\b$/gi, ' ')
    .replace(/\b(?:new|latest)\b(?=\s+(?:model|edition|version))/gi, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^[,.\-()\s]+|[,.\-()\s]+$/g, '');

const cleanSegment = (value = '') =>
  dedupeSlidingPhrases(
    dedupeSequentialWords(
      stripNoise(value)
        .replace(/\b(?:black|white|blue|green|red|pink|gold|silver|grey|gray)\s+colour\b/gi, '$1')
    )
  );

const smartCaseWord = (word = '') => {
  const bare = normalizeToken(word);
  if (BRAND_FIXES.has(bare)) {
    return word.replace(new RegExp(bare, 'i'), BRAND_FIXES.get(bare));
  }
  return word;
};

const smartBrandCase = (value = '') =>
  normalizeSpaces(value)
    .split(' ')
    .map(smartCaseWord)
    .join(' ');

const splitTitleSegments = (title = '') =>
  normalizeSpaces(title)
    .replace(SEPARATOR_REGEX, ' | ')
    .split(/\s+\|\s+|(?<=\w),\s+/)
    .map(cleanSegment)
    .filter((segment) => segment && segment.length > 1 && !STOP_SEGMENT_REGEX.test(segment));

const collectUsefulTailSpecs = (segments = []) =>
  segments
    .slice(1)
    .flatMap((segment) => segment.split(/[,/]| - /))
    .map(cleanSegment)
    .filter(Boolean)
    .filter((segment) => SPEC_TOKEN_REGEX.test(segment) || STORAGE_PAIR_REGEX.test(segment) || COLOR_REGEX.test(segment));

const chooseShortVariant = (text = '') => {
  const normalized = cleanSegment(text);
  if (!normalized || EMPTY_VARIANT_REGEX.test(normalized)) return '';
  if (STORAGE_PAIR_REGEX.test(normalized)) return normalized.replace(/\s+/g, '');
  if (COLOR_REGEX.test(normalized) && normalized.split(' ').length <= 2) return normalized;
  if (SPEC_TOKEN_REGEX.test(normalized) && normalized.length <= 24) return normalized;
  return '';
};

const buildVariantSuffix = (core = '', segments = []) => {
  const parenthetical = core.match(/\(([^)]{2,40})\)$/)?.[1] || '';
  const candidates = [parenthetical, ...collectUsefulTailSpecs(segments)];
  const chosen = [];

  for (const candidate of candidates) {
    const shortVariant = chooseShortVariant(candidate);
    if (!shortVariant) continue;
    const duplicate = chosen.some((item) => normalizeToken(item) === normalizeToken(shortVariant));
    if (duplicate) continue;
    chosen.push(shortVariant);
    if (chosen.length >= 2) break;
  }

  if (!chosen.length) return '';
  if (chosen.length === 1) return `(${chosen[0]})`;
  return `(${chosen.join('/')})`;
};

const extractInlineVariantSuffix = (core = '') => {
  const ramMatch = core.match(/\b(\d+\s?GB)\s+RAM\b/i);
  const storageMatch = core.match(/\b(\d+\s?(?:GB|TB))\s+(?:SSD|HDD|ROM|Storage)\b/i);
  const colorMatch = core.match(/\b(?:Midnight|Starlight|Blue|Black|White|Green|Red|Pink|Gold|Silver|Grey|Gray|Purple|Yellow|Orange|Navy|Beige|Brown)\b/i);
  const parts = [];

  if (ramMatch) parts.push(ramMatch[1].replace(/\s+/g, ''));
  if (storageMatch) parts.push(storageMatch[1].replace(/\s+/g, ''));
  if (!parts.length && colorMatch) parts.push(colorMatch[0]);

  if (!parts.length) {
    return { core, suffix: '' };
  }

  return {
    core: core
      .replace(/\b\d+\s?GB\s+RAM\b/gi, ' ')
      .replace(/\b\d+\s?(?:GB|TB)\s+(?:SSD|HDD|ROM|Storage)\b/gi, ' ')
      .replace(/\bWindows\s?11\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    suffix: `(${parts.join('/')})`
  };
};

const trimLongTitle = (value = '', maxChars = 70, maxWords = 12) => {
  const words = normalizeSpaces(value).split(' ').filter(Boolean);
  const chosen = [];
  for (const word of words) {
    const candidate = [...chosen, word].join(' ');
    if (chosen.length >= maxWords || candidate.length > maxChars) break;
    chosen.push(word);
  }
  return normalizeSpaces(chosen.join(' ')).replace(TRIM_TRAILING_CONNECTOR_REGEX, '').replace(/[,\-.]+$/g, '');
};

const dropLowValueTail = (value = '') => {
  const words = normalizeSpaces(value).split(' ').filter(Boolean);
  while (words.length > 4) {
    const tail = words[words.length - 1];
    const tailNorm = normalizeToken(tail);
    if (['with', 'for', 'and', 'online', 'india', 'best'].includes(tailNorm)) {
      words.pop();
      continue;
    }
    break;
  }
  return words.join(' ');
};

const compactCardCore = (core = '') =>
  normalizeSpaces(core.replace(REMOVE_FROM_CARD_REGEX, ' '))
    .replace(/\s+/g, ' ')
    .trim();

const compactTitle = (rawTitle = '', { maxChars, maxWords, includeSpecs }) => {
  const segments = splitTitleSegments(rawTitle);
  if (!segments.length) return 'Product Deal';

  let core = cleanSegment(segments[0]);
  core = core.replace(/\(([^)]*)\)$/g, '').trim();
  core = core.replace(/^([A-Za-z]+)\s+Laptop\s+([A-Za-z0-9-]+)/i, '$1 $2 Laptop');
  core = dropLowValueTail(core);

  const inlineVariant = extractInlineVariantSuffix(core);
  core = inlineVariant.core;

  if (!includeSpecs) {
    core = compactCardCore(core);
  }

  const hasProductType = PRODUCT_TYPE_REGEX.test(core);
  const hasModel = MODEL_REGEX.test(core);
  const baseWordLimit = includeSpecs ? 10 : 8;
  const limitedCore = trimLongTitle(
    core,
    includeSpecs ? maxChars : Math.min(maxChars, 58),
    hasProductType || hasModel ? baseWordLimit : baseWordLimit + 1
  );

  const variantSuffix = includeSpecs ? (inlineVariant.suffix || buildVariantSuffix(segments[0], segments)) : '';
  let candidate = limitedCore;
  if (variantSuffix && !candidate.includes(variantSuffix)) {
    candidate = `${candidate} ${variantSuffix}`.trim();
  }

  candidate = cleanSegment(candidate)
    .replace(/\(\s*\)/g, '')
    .replace(/\bbluetooth\b$/i, '')
    .replace(/\s+/g, ' ')
    .replace(TRIM_TRAILING_CONNECTOR_REGEX, '')
    .replace(/[,\-.]+$/g, '');

  if ((candidate.match(/\(/g) || []).length > (candidate.match(/\)/g) || []).length) {
    candidate = `${candidate})`;
  }

  const polished = smartBrandCase(trimLongTitle(candidate, maxChars, maxWords));
  return polished || 'Product Deal';
};

export const getCardTitle = (rawTitle = '') =>
  compactTitle(rawTitle, {
    maxChars: MAX_CARD_CHARS,
    maxWords: 8,
    includeSpecs: false
  });

export const getDisplayTitle = (rawTitle = '') =>
  compactTitle(rawTitle, {
    maxChars: MAX_DETAIL_CHARS,
    maxWords: 10,
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
