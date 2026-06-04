import https from 'https';
import fs from 'fs';

https.get('https://www.purplle.com/product/faces-canada-weightless-matte-finish-foundation-ivory-01-18ml', {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
}, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        fs.writeFileSync('purplle_native.html', data);
        console.log('Saved to purplle_native.html');
    });
}).on('error', (err) => {
    console.log("Error: " + err.message);
});
