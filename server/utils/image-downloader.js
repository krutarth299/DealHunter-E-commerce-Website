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
            localUrls.push(`/uploads/images/${filename}`);
        } catch (error) {
            console.error(`[IMAGE_DOWNLOADER] Failed to download image ${url}:`, error.message);
            // Fallback to the original URL if download fails
            localUrls.push(url);
        }
    }
    return localUrls;
};
