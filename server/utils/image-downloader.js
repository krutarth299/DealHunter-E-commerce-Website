import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../../uploads/images');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const downloadImage = (url, filepath) => {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        };
        client.get(url, options, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                   .on('error', reject)
                   .once('close', () => resolve(filepath));
            } else if (res.statusCode === 301 || res.statusCode === 302) {
                // Follow redirect
                downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
            } else {
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
            }
        }).on('error', reject);
    });
};

export const downloadAndSaveImages = async (urls) => {
    console.log('[IMAGE_DOWNLOADER] urls received:', urls);
    const localUrls = [];
    for (let url of urls) {
        if (!url || url.startsWith('/uploads/')) {
            if (url) localUrls.push(url);
            continue;
        }
        
        try {
            const urlObj = new URL(url);
            const ext = path.extname(urlObj.pathname) || '.jpg';
            const validExt = ['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext.toLowerCase()) ? ext : '.jpg';
            const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${validExt}`;
            const filepath = path.join(UPLOADS_DIR, filename);
            
            await downloadImage(url, filepath);
            
            // Check file size to weed out 1x1 tracking pixels (typically < 100 bytes)
            const stats = fs.statSync(filepath);
            if (stats.size < 500) {
                fs.unlinkSync(filepath);
                console.log(`[IMAGE_DOWNLOADER] Skipped ${url} (too small: ${stats.size} bytes)`);
                continue;
            }
            
            // Use Jimp to check if the image is mostly a solid color (e.g. blank white video placeholders)
            try {
                const jimpModule = await import('jimp');
                const Jimp = jimpModule.Jimp || jimpModule.default?.Jimp || jimpModule.default;
                
                const buffer = fs.readFileSync(filepath);
                const image = await Jimp.read(buffer);
                const data = image.bitmap.data;
                
                let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
                // Sample pixels (skip some to make it faster for large images)
                const step = data.length > 500000 ? 16 : 4;
                for (let i = 0; i < data.length; i += step) {
                    const r = data[i], g = data[i+1], b = data[i+2];
                    if (r < minR) minR = r; if (r > maxR) maxR = r;
                    if (g < minG) minG = g; if (g > maxG) maxG = g;
                    if (b < minB) minB = b; if (b > maxB) maxB = b;
                }
                const diff = Math.max(maxR - minR, maxG - minG, maxB - minB);
                
                if (diff < 15) {
                    fs.unlinkSync(filepath);
                    console.log(`[IMAGE_DOWNLOADER] Skipped ${url} (solid color image, diff: ${diff})`);
                    continue;
                }
            } catch (err) {
                console.warn(`[IMAGE_DOWNLOADER] Jimp check failed for ${filepath}:`, err.message);
                // Keep the image if Jimp fails to read it (might be valid webp/avif that Jimp doesn't support)
            }
            
            localUrls.push(`/uploads/images/${filename}`);
        } catch (error) {
            console.error(`[IMAGE_DOWNLOADER] Failed to download image ${url}:`, error.message);
            // Fallback to the original URL if download fails
            localUrls.push(url);
        }
    }
    return localUrls;
};
