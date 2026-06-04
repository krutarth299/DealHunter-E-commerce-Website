const fs = require('fs');
const path = require('path');

const extractorsDir = path.join(__dirname, 'extractors');
const files = fs.readdirSync(extractorsDir).filter(f => f.endsWith('.js'));

for (const file of files) {
    const filePath = path.join(extractorsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace .innerText with .textContent for all DOM fallbacks
    content = content.replace(/\.innerText/g, '.textContent');
    
    // For croma specifically, make sure getText handles it
    // getText in most files is: el.innerText || el.textContent
    content = content.replace(/el\.innerText\s*\|\|\s*el\.textContent/g, 'el.textContent');
    
    // In case there is textContent.textContent
    content = content.replace(/\.textContent\.textContent/g, '.textContent');

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
}
