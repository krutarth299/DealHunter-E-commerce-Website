const fs = require('fs');
const path = require('path');

const extractorsDir = path.join(__dirname, 'server', 'extractors');
const files = fs.readdirSync(extractorsDir);

for (const file of files) {
    if (file.endsWith('.js')) {
        const filePath = path.join(extractorsDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(/script\.innerText/g, 'script.textContent');
        fs.writeFileSync(filePath, content);
    }
}

console.log("Replaced script.innerText with script.textContent in all extractors.");
