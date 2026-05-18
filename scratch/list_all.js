const fs = require('fs');
const path = require('path');

function searchEnv(dir, depth = 0) {
  if (depth > 3) return;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (file.includes('.env')) {
        console.log('Found env file:', fullPath);
      }
      if (fs.statSync(fullPath).isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        searchEnv(fullPath, depth + 1);
      }
    }
  } catch (e) {
    // Ignore errors
  }
}

console.log('Searching env files from workspace root...');
searchEnv('.');
console.log('Searching env files in parent directory...');
searchEnv('..');
console.log('Searching env files in home directory...');
searchEnv('C:\\Users\\ahors');
