import fs from 'fs';
const html = fs.readFileSync('C:/Users/dhana/OneDrive/Desktop/project/server/fc_dump.html', 'utf8');

const regex = /<a[^>]*class="([^"]*)"[^>]*>([^<]+)<\/a>/gi;
let match;
const res = [];
while ((match = regex.exec(html)) !== null) {
    res.push(match[1] + ' : ' + match[2].trim());
}
console.log(res.filter(r => r.length > 5 && !r.includes('img') && !r.includes('span')).slice(0, 50).join('\n'));
