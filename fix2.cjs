const fs = require('fs');
const path = require('path');

const extractorsDir = path.join(__dirname, 'server', 'extractors');
const files = fs.readdirSync(extractorsDir);

for (const file of files) {
    if (file.endsWith('.js') && file !== 'index.js') {
        const filePath = path.join(extractorsDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace timeout
        content = content.replace(/setTimeout\(r, \d+\)/g, 'setTimeout(r, 4500)');
        
        // Robust JSON-LD parsing
        content = content.replace(
            /const parsed = JSON\.parse\(script\.textContent \|\| '\{\}'\);/g,
            `let text = (script.textContent || '').trim();
                let parsed = {};
                try {
                    parsed = JSON.parse(text);
                } catch(e) {
                    try {
                        text = text.replace(/}[\\s\\n]*}$/, '}');
                        parsed = JSON.parse(text);
                    } catch(e2) {}
                }`
        );
        
        fs.writeFileSync(filePath, content);
    }
}

console.log("Updated extractors with robust JSON-LD parsing and 4500ms timeout.");
