import fs from 'fs';
import path from 'path';

const dir = 'c:\\Users\\dhana\\OneDrive\\Desktop\\project';

console.log('Watching for file changes in:', dir);

fs.watch(dir, { recursive: true }, (eventType, filename) => {
    if (filename && !filename.includes('node_modules') && !filename.includes('.git')) {
        console.log(`[CHANGE DETECTED] ${eventType} - ${filename}`);
    }
});
