const https = require('https');
https.get('https://www.reliancedigital.in/apple-iphone-13-128-gb-starlight/p/491997699', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0' }
}, (res) => {
    let html = '';
    res.on('data', c => html += c);
    res.on('end', () => {
        const title = html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1] || '';
        const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
        console.log('Title:', title);
        if (ldMatch) {
            try {
                let parsed;
                for (const ld of ldMatch) {
                    const jsonStr = ld.replace(/<script[^>]*>/, '').replace('</script>', '');
                    const j = JSON.parse(jsonStr);
                    if (j['@type'] === 'Product' || (Array.isArray(j) && j.some(i => i['@type']==='Product'))) {
                        parsed = Array.isArray(j) ? j.find(i => i['@type']==='Product') : j;
                        break;
                    }
                }
                if (parsed) {
                    console.log('JSON-LD Name:', parsed.name);
                    console.log('JSON-LD Price:', Array.isArray(parsed.offers) ? parsed.offers[0].price : parsed.offers?.price);
                }
            } catch (e) {
                console.error('LD Error', e);
            }
        }
    });
});
