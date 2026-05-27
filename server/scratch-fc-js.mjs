import fs from 'fs';
const html = fs.readFileSync('C:/Users/dhana/OneDrive/Desktop/project/server/fc_dump.html', 'utf8');

const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
while ((match = regex.exec(html)) !== null) {
    const text = match[1];
    if (text.includes('category') || text.includes('Category')) {
        let m = text.match(/"category"\s*:\s*"([^"]+)"/i);
        if (m) console.log('Found category:', m[1]);
        m = text.match(/category\s*:\s*"([^"]+)"/i);
        if (m) console.log('Found category2:', m[1]);
        m = text.match(/Category\s*=\s*"([^"]+)"/i);
        if (m) console.log('Found category3:', m[1]);
        
        let m4 = text.match(/"categoryName"\s*:\s*"([^"]+)"/i);
        if (m4) console.log('Found categoryName:', m4[1]);
    }
}
