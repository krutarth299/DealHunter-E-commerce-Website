const fs = require('fs');
const path = require('path');

const dealsPath = path.join(process.cwd(), 'server', 'routes', 'deals.js');
let code = fs.readFileSync(dealsPath, 'utf8');

if (!code.includes("ssrEngine")) {
    // Add require at the top
    code = "const ssrEngine = require('../ssrEngine');\n" + code;
    
    // In POST, PUT, DELETE, clear cache
    // Let's replace res.json(newDeal) with a wrapper or intercept it.
    // Searching for res.json() calls in modifying routes.
    code = code.replace(/res\.status\(201\)\.json\((.*?)\);/g, "ssrEngine.clearCache && ssrEngine.clearCache();\n            res.status(201).json($1);");
    code = code.replace(/res\.json\((.*?)\);/g, "ssrEngine.clearCache && ssrEngine.clearCache();\n        res.json($1);");
    
    fs.writeFileSync(dealsPath, code);
}
